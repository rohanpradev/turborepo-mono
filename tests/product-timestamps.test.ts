import { describe, expect, test } from "bun:test";
import { toUtcISOString } from "../apps/product-service/src/utils/timestamps";

describe("product timestamps", () => {
  test("preserves the API's UTC millisecond representation", () => {
    expect(
      toUtcISOString(Temporal.PlainDateTime.from("2026-09-05T12:34:56.123456")),
    ).toBe("2026-09-05T12:34:56.123Z");
  });

  test.each(["Asia/Kolkata", "America/Los_Angeles"])(
    "uses UTC for database writes and outbox leases under %s",
    (timezone) => {
      const result = Bun.spawnSync(
        [
          process.execPath,
          "-e",
          `import { nowUtc, toUtcISOString } from "./apps/product-service/src/utils/timestamps.ts";
          const timestamp = Date.parse(toUtcISOString(nowUtc()));
          if (Math.abs(timestamp - Date.now()) > 5000) process.exit(1);`,
        ],
        { cwd: `${import.meta.dir}/..`, env: { ...process.env, TZ: timezone } },
      );
      expect(result.exitCode).toBe(0);
    },
  );
});
