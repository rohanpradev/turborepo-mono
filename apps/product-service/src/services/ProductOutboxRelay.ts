import { and, db, or } from "@repo/product-db";
import { productServiceRuntime } from "@/runtime";
import { producer } from "@/utils/kafka";

import { nowUtc } from "@/utils/timestamps";

const POLL_MS = 1_000;
const LEASE_MS = 30_000;
let timer: ReturnType<typeof setTimeout> | undefined;
let stopped = true;
let inFlight: Promise<void> | undefined;

const nextDelay = (attempts: number) =>
  Math.min(60_000, 1_000 * 2 ** Math.min(attempts, 6));

export const relayProductOutboxOnce = async () => {
  const currentTime = nowUtc();
  const claimableEvents = db.orm.public.ProductOutboxEvent.where((event) =>
    event.availableAt.lte(currentTime),
  ).where((event) =>
    or(
      event.status.eq("PENDING"),
      and(event.status.eq("PUBLISHING"), event.leaseUntil.lt(currentTime)),
    ),
  );
  const event = await claimableEvents
    .orderBy((event) => event.createdAt.asc())
    .first();
  if (!event) return;

  // Prisma 8's single-row update first resolves an identity, then updates by
  // primary key. Use the count terminal to keep all lease predicates in the
  // atomic UPDATE statement, including when another worker races this claim.
  const attempts = event.attempts + 1;
  const claimed = await claimableEvents
    .where({ id: event.id, attempts: event.attempts })
    .updateAndCount({
      status: "PUBLISHING",
      leaseUntil: currentTime.add({ milliseconds: LEASE_MS }),
      attempts,
      updatedAt: currentTime,
    });
  if (claimed !== 1) return;

  // A lease can expire during a slow publish. Only this claim may finalize it;
  // an older worker must never overwrite a newer worker's retry or success.
  const ownedEvent = db.orm.public.ProductOutboxEvent.where({
    id: event.id,
    status: "PUBLISHING",
    attempts,
  });

  try {
    await producer.start();
    await producer.send(event.topic as never, event.payload as never, {
      key: event.eventKey,
      headers: { "outbox-event-id": event.id },
    });
    const publishedAt = nowUtc();
    await ownedEvent.updateAndCount({
      status: "PUBLISHED",
      publishedAt,
      leaseUntil: null,
      lastError: null,
      updatedAt: publishedAt,
    });
    productServiceRuntime.markReady("kafka.producer");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Outbox publish failed.";
    const retryAt = nowUtc();
    await ownedEvent.updateAndCount({
      status: "PENDING",
      leaseUntil: null,
      lastError: message.slice(0, 2_000),
      availableAt: retryAt.add({
        milliseconds: nextDelay(event.attempts + 1),
      }),
      updatedAt: retryAt,
    });
    productServiceRuntime.markNotReady("kafka.producer", message);
  }
};

const run = async () => {
  if (stopped) return;
  try {
    await relayProductOutboxOnce();
  } catch (error) {
    console.error("Product outbox relay failed:", error);
  } finally {
    if (!stopped)
      timer = setTimeout(() => {
        inFlight = run();
      }, POLL_MS);
  }
};

export const startProductOutboxRelay = () => {
  if (!stopped) return;
  stopped = false;
  inFlight = run();
};

export const stopProductOutboxRelay = async () => {
  stopped = true;
  if (timer) clearTimeout(timer);
  await inFlight;
};
