import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

type LocalProfile = {
  global: { env: Record<string, string> };
  stripeCli: { enabled: boolean };
  services: Record<string, { env?: Record<string, string> }>;
  jobs: Record<string, { enabled: boolean }>;
};

describe("local Kubernetes commerce profiles", () => {
  for (const name of ["ecommerce", "ecommerce-full"]) {
    test(`${name} connects browser, Kafka, and webhook endpoints`, () => {
      const profile = Bun.YAML.parse(
        readFileSync(
          new URL(
            `../deploy/environments/local/${name}.values.yaml`,
            import.meta.url,
          ),
          "utf8",
        ),
      ) as LocalProfile;
      expect(profile.global.env.KAFKA_BROKERS).toBe(
        "host.docker.internal:19094,host.docker.internal:19095,host.docker.internal:19096",
      );
      for (const setting of [
        "CORS_ALLOWED_ORIGINS",
        "CLERK_AUTHORIZED_PARTIES",
      ]) {
        expect(profile.global.env[setting]?.split(",")).toEqual(
          expect.arrayContaining([
            "https://shop.localhost:9443",
            "https://admin.localhost:9443",
          ]),
        );
      }
      expect(profile.stripeCli.enabled).toBe(true);
      expect(profile.services.payment?.env?.CLIENT_APP_URL).toBe(
        "https://shop.localhost:9443",
      );
      expect(profile.services.client?.env?.NEXT_PUBLIC_CLIENT_APP_URL).toBe(
        "https://shop.localhost:9443",
      );
      expect(profile.services.admin?.env?.NEXT_PUBLIC_ADMIN_APP_URL).toBe(
        "https://admin.localhost:9443",
      );
      expect(profile.jobs["migrate-product-db"]?.enabled).toBe(true);
      expect(profile.jobs["seed-product-db"]?.enabled).toBe(true);
    });
  }
});
