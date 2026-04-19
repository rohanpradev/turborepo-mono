import { afterEach, describe, expect, it } from "bun:test";
import {
  createServiceRuntime,
  getCorsOrigins,
} from "../packages/hono-utils/src/index";

const originalCorsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS;

afterEach(() => {
  if (originalCorsAllowedOrigins === undefined) {
    delete process.env.CORS_ALLOWED_ORIGINS;
    return;
  }

  process.env.CORS_ALLOWED_ORIGINS = originalCorsAllowedOrigins;
});

describe("@repo/hono-utils", () => {
  it("reports readiness based on required dependencies only", () => {
    const runtime = createServiceRuntime("payment-service", [
      { name: "kafka.producer" },
      { name: "stripe", required: false },
    ] as const);

    expect(runtime.snapshot()).toMatchObject({
      ready: false,
      dependencies: [
        { name: "kafka.producer", status: "not_ready", required: true },
        { name: "stripe", status: "not_ready", required: false },
      ],
    });

    runtime.markReady("kafka.producer", "Connected");
    runtime.markDisabled("stripe", "Stripe not configured");

    expect(runtime.snapshot()).toMatchObject({
      ready: true,
      dependencies: [
        { name: "kafka.producer", status: "ready", required: true },
        { name: "stripe", status: "disabled", required: false },
      ],
    });
  });

  it("uses configured CORS origins when present", () => {
    process.env.CORS_ALLOWED_ORIGINS =
      "https://shop.localhost, https://admin.localhost ";

    expect(getCorsOrigins()).toEqual([
      "https://shop.localhost",
      "https://admin.localhost",
    ]);
  });
});
