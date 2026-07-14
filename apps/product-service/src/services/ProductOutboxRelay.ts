import { prisma } from "@repo/product-db";
import { productServiceRuntime } from "@/runtime";
import { producer } from "@/utils/kafka";

const POLL_MS = 1_000;
const LEASE_MS = 30_000;
let timer: ReturnType<typeof setTimeout> | undefined;
let stopped = false;

const nextDelay = (attempts: number) =>
  Math.min(60_000, 1_000 * 2 ** Math.min(attempts, 6));

const relayOnce = async () => {
  const now = new Date();
  const event = await prisma.productOutboxEvent.findFirst({
    where: {
      availableAt: { lte: now },
      OR: [
        { status: "PENDING" },
        { status: "PUBLISHING", leaseUntil: { lt: now } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  if (!event) return;

  const claimed = await prisma.productOutboxEvent.updateMany({
    where: {
      id: event.id,
      OR: [
        { status: "PENDING" },
        { status: "PUBLISHING", leaseUntil: { lt: now } },
      ],
    },
    data: {
      status: "PUBLISHING",
      leaseUntil: new Date(now.getTime() + LEASE_MS),
      attempts: { increment: 1 },
    },
  });
  if (claimed.count === 0) return;

  try {
    await producer.start();
    await producer.send(event.topic as never, event.payload as never, {
      key: event.eventKey,
      headers: { "outbox-event-id": event.id },
    });
    await prisma.productOutboxEvent.update({
      where: { id: event.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        leaseUntil: null,
        lastError: null,
      },
    });
    productServiceRuntime.markReady("kafka.producer");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Outbox publish failed.";
    await prisma.productOutboxEvent.update({
      where: { id: event.id },
      data: {
        status: "PENDING",
        leaseUntil: null,
        lastError: message.slice(0, 2_000),
        availableAt: new Date(Date.now() + nextDelay(event.attempts + 1)),
      },
    });
    productServiceRuntime.markNotReady("kafka.producer", message);
  }
};

const run = async () => {
  if (stopped) return;
  try {
    await relayOnce();
  } catch (error) {
    console.error("Product outbox relay failed:", error);
  } finally {
    if (!stopped) timer = setTimeout(() => void run(), POLL_MS);
  }
};

export const startProductOutboxRelay = () => {
  stopped = false;
  void run();
};

export const stopProductOutboxRelay = () => {
  stopped = true;
  if (timer) clearTimeout(timer);
};
