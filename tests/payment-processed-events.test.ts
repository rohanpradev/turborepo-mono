import { afterEach, describe, expect, it } from "bun:test";
import {
  claimProcessableEvent,
  clearProcessedEventsForTesting,
  markEventProcessed,
  releaseProcessableEvent,
} from "../apps/payment-service/src/observability/processedEvents";

afterEach(() => {
  clearProcessedEventsForTesting();
});

describe("payment-service processed event registry", () => {
  it("blocks concurrent processing for the same event key", () => {
    expect(claimProcessableEvent("stripe:evt_1")).toBe(true);
    expect(claimProcessableEvent("stripe:evt_1")).toBe(false);
  });

  it("keeps completed events deduplicated", () => {
    expect(claimProcessableEvent("stripe:evt_2")).toBe(true);

    markEventProcessed("stripe:evt_2");

    expect(claimProcessableEvent("stripe:evt_2")).toBe(false);
  });

  it("allows retry after a failed processing attempt is released", () => {
    expect(claimProcessableEvent("stripe:evt_3")).toBe(true);

    releaseProcessableEvent("stripe:evt_3");

    expect(claimProcessableEvent("stripe:evt_3")).toBe(true);
  });
});
