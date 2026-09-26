import { expect, test } from "bun:test";
import { parseResources } from "../scripts/helm-profile-policy";

test.skipIf(!Bun.which("helm"))(
  "Services route only to application pods, never migration or seed pods",
  () => {
    const result = Bun.spawnSync([
      "helm",
      "template",
      "routing-test",
      "charts/ecommerce",
      "--set",
      "jobs.seed-product-db.enabled=true",
    ]);
    expect(result.exitCode).toBe(0);
    const resources = parseResources(new TextDecoder().decode(result.stdout));
    const podLabels = (resource: Record<string, unknown>) =>
      (
        resource.spec as {
          template: { metadata: { labels: Record<string, string> } };
        }
      ).template.metadata.labels;
    for (const service of resources.filter(({ kind }) => kind === "Service")) {
      const selector = (service.spec as { selector: Record<string, string> })
        .selector;
      const selects = (resource: Record<string, unknown>) =>
        Object.entries(selector).every(
          ([key, value]) => podLabels(resource)[key] === value,
        );
      expect(
        resources.filter(({ kind }) => kind === "Deployment").filter(selects),
      ).toHaveLength(1);
      expect(
        resources.filter(({ kind }) => kind === "Job").filter(selects),
      ).toHaveLength(0);
    }
    expect(resources.filter(({ kind }) => kind === "Job")).toHaveLength(3);
  },
);

test.skipIf(!Bun.which("helm"))(
  "Rollouts allow endpoint propagation and enough time to drain requests",
  () => {
    const result = Bun.spawnSync([
      "helm",
      "template",
      "drain-test",
      "charts/ecommerce",
    ]);
    expect(result.exitCode).toBe(0);
    for (const resource of parseResources(
      new TextDecoder().decode(result.stdout),
    )) {
      if (resource.kind !== "Deployment") continue;
      const { spec } = (
        resource.spec as {
          template: {
            spec: {
              terminationGracePeriodSeconds: number;
              containers: Array<{
                lifecycle: { preStop: { sleep: { seconds: number } } };
              }>;
            };
          };
        }
      ).template;
      const delay = spec.containers[0]?.lifecycle.preStop.sleep.seconds ?? 0;
      expect(delay).toBe(5);
      expect(spec.terminationGracePeriodSeconds - delay).toBeGreaterThan(25);
    }
    const invalid = Bun.spawnSync([
      "helm",
      "template",
      "drain-test",
      "charts/ecommerce",
      "--set",
      "global.terminationGracePeriodSeconds=5",
    ]);
    expect(invalid.exitCode).not.toBe(0);
    expect(new TextDecoder().decode(invalid.stderr)).toContain(
      "must exceed global.preStopDelaySeconds",
    );
  },
);

// CI installs Helm before tests; application-only local setups can omit it.
test.skipIf(!Bun.which("helm"))(
  "Helm preserves zero rollout values and accepts memory autoscaling",
  () => {
    const result = Bun.spawnSync([
      "helm",
      "template",
      "options-test",
      "charts/ecommerce",
      "--set",
      "services.product.revisionHistoryLimit=0",
      "--set",
      "services.product.podDisruptionBudget.minAvailable=null",
      "--set",
      "services.product.podDisruptionBudget.maxUnavailable=0",
      "--set",
      "services.product.autoscaling.enabled=true",
      "--set",
      "services.product.autoscaling.targetMemoryUtilizationPercentage=80",
    ]);
    expect(new TextDecoder().decode(result.stderr)).toBe("");
    expect(result.exitCode).toBe(0);
    const resources = parseResources(new TextDecoder().decode(result.stdout));
    const named = (kind: string) =>
      resources.find(
        (resource) =>
          resource.kind === kind &&
          (resource.metadata as { name: string }).name ===
            "options-test-ecommerce-product-service",
      );
    expect(named("Deployment")?.spec).toMatchObject({
      revisionHistoryLimit: 0,
    });
    expect(named("PodDisruptionBudget")?.spec).toMatchObject({
      maxUnavailable: 0,
    });
    expect(named("HorizontalPodAutoscaler")?.spec).toMatchObject({
      metrics: expect.arrayContaining([
        {
          type: "Resource",
          resource: {
            name: "memory",
            target: { type: "Utilization", averageUtilization: 80 },
          },
        },
      ]),
    });
    expect(named("Deployment")?.spec).not.toHaveProperty("replicas");
  },
);

test.skipIf(!Bun.which("helm"))(
  "Helm health checks follow service ports and preserve immediate job cleanup",
  () => {
    const result = Bun.spawnSync([
      "helm",
      "template",
      "options-test",
      "charts/ecommerce",
      "--set",
      "services.product.service.port=9000",
      "--set",
      "jobs.migrate-product-db.ttlSecondsAfterFinished=0",
      "--set",
      "services.product.autoscaling.enabled=true",
      "--set",
      "services.product.autoscaling.targetCPUUtilizationPercentage=150",
    ]);
    expect(new TextDecoder().decode(result.stderr)).toBe("");
    expect(result.exitCode).toBe(0);
    const resources = parseResources(new TextDecoder().decode(result.stdout));
    const job = resources.find(
      (resource) =>
        resource.kind === "Job" &&
        (resource.metadata as { name: string }).name.endsWith(
          "migrate-product-db",
        ),
    );
    expect(job?.spec).toMatchObject({ ttlSecondsAfterFinished: 0 });
    const pod = resources.find((resource) => resource.kind === "Pod");
    const spec = pod?.spec as { containers: Array<{ command: string[] }> };
    expect(spec.containers[0]?.command.join(" ")).toContain(
      "http://options-test-ecommerce-product-service:9000/health/ready",
    );
  },
);

for (const [name, settings, message] of [
  [
    "inverted replica range",
    ["services.product.autoscaling.minReplicas=7"],
    "minReplicas must not exceed maxReplicas",
  ],
  [
    "missing utilization targets",
    ["services.product.autoscaling.targetCPUUtilizationPercentage=null"],
    "requires at least one utilization target",
  ],
  [
    "missing CPU request",
    ["services.product.resources.requests.cpu=null"],
    "requires resources.requests.cpu",
  ],
  [
    "missing memory request",
    [
      "services.product.autoscaling.targetMemoryUtilizationPercentage=80",
      "services.product.resources.requests.memory=null",
    ],
    "requires resources.requests.memory",
  ],
  [
    "missing sidecar request",
    [
      "services.payment.autoscaling.enabled=true",
      "stripeCli.enabled=true",
      "stripeCli.resources.requests.cpu=null",
    ],
    "stripeCli autoscaling requires resources.requests.cpu",
  ],
] as const) {
  test.skipIf(!Bun.which("helm"))(`Helm rejects ${name}`, () => {
    const result = Bun.spawnSync([
      "helm",
      "template",
      "options-test",
      "charts/ecommerce",
      "--set",
      "services.product.autoscaling.enabled=true",
      ...settings.flatMap((setting) => ["--set", setting]),
    ]);
    expect(result.exitCode).not.toBe(0);
    expect(new TextDecoder().decode(result.stderr)).toContain(message);
  });
}
