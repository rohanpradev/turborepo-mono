import { readFile } from "node:fs/promises";
import { z } from "zod";
import { createKafkaClient } from "./client";
import { parseTraceparent } from "./instrumentation";
import { validateTopicMessage } from "./schemas";
import { Topics } from "./types";

const envelope = z.object({
  source: z.object({
    topic: z.enum(Object.values(Topics)),
    partition: z.number().int().nonnegative(),
    offset: z.string().regex(/^\d+$/),
  }),
  value: z.string().min(1),
  key: z.string().nullable(),
  headers: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string()), z.null()]),
  ),
});
/** @internal Validates a single exported quarantine record before any write. */
export function decodeReplay(input: unknown) {
  const record = envelope.parse(input);
  const version = record.headers["schema-version"];
  if (
    version &&
    (typeof version !== "string" ||
      Buffer.from(version, "base64").toString() !== "1")
  )
    throw new Error("Unknown event version must be migrated before replay.");
  const payload = JSON.parse(
    Buffer.from(record.value, "base64").toString("utf8"),
  );
  validateTopicMessage(record.source.topic, payload);
  const trace = record.headers.traceparent;
  const traceparent =
    typeof trace === "string"
      ? Buffer.from(trace, "base64").toString()
      : undefined;
  return {
    topic: record.source.topic,
    message: {
      key: record.key ? Buffer.from(record.key, "base64") : null,
      value: JSON.stringify(payload),
      headers: {
        "schema-version": "1",
        "replay-source": `${record.source.topic}:${record.source.partition}:${record.source.offset}`,
        ...(parseTraceparent(traceparent) ? { traceparent } : {}),
      },
    },
  };
}
if (import.meta.main) {
  const file = process.argv[2];
  if (!file)
    throw new Error(
      "Usage: bun run --cwd packages/kafka replay <one-quarantined-record.json>",
    );
  const record = decodeReplay(JSON.parse(await readFile(file, "utf8")));
  const producer = createKafkaClient("operator-replay").producer({
    idempotent: true,
    allowAutoTopicCreation: false,
  });
  await producer.connect();
  try {
    await producer.send({ topic: record.topic, messages: [record.message] });
    console.log(
      `Replayed one validated event to ${record.topic}. Preserve the source quarantine record for audit.`,
    );
  } finally {
    await producer.disconnect();
  }
}
