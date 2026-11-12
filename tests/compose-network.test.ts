import { expect, test } from "bun:test";

test("Docker API access is isolated from application containers", async () => {
  const compose = Bun.YAML.parse(
    await Bun.file(new URL("../compose.yml", import.meta.url)).text(),
  ) as {
    services: Record<
      string,
      {
        networks: string[];
        ports?: string[];
        environment?: Record<string, unknown>;
      }
    >;
    networks: Record<string, { internal?: boolean }>;
  };
  const proxy = compose.services["docker-socket-proxy"];
  expect(proxy?.networks).toEqual(["docker-api"]);
  expect(proxy?.ports).toBeUndefined();
  expect(proxy?.environment?.POST).toBe(0);
  expect(compose.networks["docker-api"]?.internal).toBe(true);
  expect(
    Object.entries(compose.services)
      .filter(([, service]) => service.networks.includes("docker-api"))
      .map(([name]) => name)
      .sort(),
  ).toEqual(["docker-socket-proxy", "traefik"]);
  expect(compose.services.traefik?.networks).toContain("ecommerce-network");
});

test("Compose gates database-backed services on their own migrations", async () => {
  const compose = Bun.YAML.parse(
    await Bun.file(new URL("../compose.yml", import.meta.url)).text(),
  ) as {
    services: Record<
      string,
      { depends_on?: Record<string, { condition: string }> }
    >;
  };

  for (const [service, migration] of [
    ["product-service", "product-db-migrate"],
    ["order-service", "order-db-indexes"],
    ["payment-service", "payment-db-migrate"],
  ] as const) {
    expect(compose.services[service]?.depends_on?.[migration]?.condition).toBe(
      "service_completed_successfully",
    );
  }
  expect(
    compose.services["kafka-ui"]?.depends_on?.["payment-db-migrate"],
  ).toBeUndefined();
});
