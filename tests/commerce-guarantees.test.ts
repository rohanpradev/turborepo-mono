import { expect, test } from "bun:test";
import { decodeReplay } from "../packages/kafka/src/replay";
import { validateTopicMessage } from "../packages/kafka/src/schemas";
import { Topics } from "../packages/kafka/src/types";
import { isPlatformAdmin } from "../packages/types/src/auth";

test("organization roles do not confer platform administration", () => {
  expect(
    isPlatformAdmin("u", { org_role: "org:admin" } as never, new Set()),
  ).toBe(false);
  expect(isPlatformAdmin("u", { metadata: { role: "admin" } }, new Set())).toBe(
    true,
  );
  expect(isPlatformAdmin("u", {}, new Set(["u"]))).toBe(true);
});
test("malformed events fail before business handlers and explicit replay validates payload and version", () => {
  expect(() =>
    validateTopicMessage(Topics.PRODUCT_DELETED, {
      id: "1",
      deletedAt: "yesterday",
    }),
  ).toThrow();
  const record = {
    source: { topic: Topics.PRODUCT_DELETED, partition: 0, offset: "1" },
    key: null,
    headers: {},
    value: Buffer.from(
      JSON.stringify({ id: "1", deletedAt: new Date().toISOString() }),
    ).toString("base64"),
  };
  expect(decodeReplay(record).topic).toBe(Topics.PRODUCT_DELETED);
  expect(() =>
    decodeReplay({
      ...record,
      headers: { "schema-version": Buffer.from("2").toString("base64") },
    }),
  ).toThrow();
  expect(() =>
    decodeReplay({ ...record, value: Buffer.from("{}").toString("base64") }),
  ).toThrow();
});
