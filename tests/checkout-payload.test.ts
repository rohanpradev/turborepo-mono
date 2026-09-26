import { expect, test } from "bun:test";
import {
  CHECKOUT_REQUEST_MAX_BODY_SIZE_BYTES as LIMIT,
  getCheckoutRequestError,
  readCheckoutPayload,
} from "../apps/client/src/lib/checkout-payload";

test("checkout rejects cross-origin browser requests and simple form content types", () => {
  for (const site of ["cross-site", "same-site"]) {
    expect(getCheckoutRequestError(new Headers({ "sec-fetch-site": site, "content-type": "application/json" }))?.status).toBe(403);
  }
  for (const contentType of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", ""]) {
    expect(getCheckoutRequestError(new Headers({ "content-type": contentType }))?.status).toBe(415);
  }
});

test("checkout accepts same-origin JSON and authenticated clients without Fetch Metadata", () => {
  for (const site of ["same-origin", "none", ""]) {
    const headers = new Headers({ "content-type": "Application/JSON; charset=utf-8" });
    if (site) headers.set("sec-fetch-site", site);
    expect(getCheckoutRequestError(headers)).toBeNull();
  }
});

test("checkout does not wait for an unresponsive oversized stream to finish cancelling", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(LIMIT + 1)); },
    cancel() { return new Promise<void>(() => {}); },
  });
  expect(await readCheckoutPayload(request(body))).toEqual({ kind: "too_large" });
});

const request = (body: BodyInit, headers?: HeadersInit) =>
  new Request("https://shop.example/api/checkout", {
    method: "POST",
    body,
    headers,
  });

test("checkout body limit counts bytes and accepts the exact boundary", async () => {
  expect(
    await readCheckoutPayload(request(`"${"a".repeat(LIMIT - 2)}"`)),
  ).toEqual({
    kind: "ok",
    data: "a".repeat(LIMIT - 2),
  });
  expect(
    await readCheckoutPayload(request(`"${"é".repeat(LIMIT / 2)}"`)),
  ).toEqual({
    kind: "too_large",
  });
});

test("checkout stops reading oversized chunked bodies even with a false length", async () => {
  let cancelled = false;
  let reads = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      reads += 1;
      controller.enqueue(new Uint8Array(LIMIT / 2));
    },
    cancel() {
      cancelled = true;
    },
  });
  expect(
    await readCheckoutPayload(request(body, { "content-length": "1" })),
  ).toEqual({
    kind: "too_large",
  });
  expect(cancelled).toBe(true);
  expect(reads).toBeLessThanOrEqual(4);
});

test("checkout handles UTF-8 split across chunks and invalid JSON", async () => {
  const bytes = new TextEncoder().encode('"é"');
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, 2));
      controller.enqueue(bytes.slice(2));
      controller.close();
    },
  });
  expect(await readCheckoutPayload(request(body))).toEqual({
    kind: "ok",
    data: "é",
  });
  expect(await readCheckoutPayload(request("{"))).toEqual({ kind: "invalid" });
});

test("checkout rejects declared oversized bodies before reading", async () => {
  expect(
    await readCheckoutPayload(
      request("{}", { "content-length": String(LIMIT + 1) }),
    ),
  ).toEqual({
    kind: "too_large",
  });
});
