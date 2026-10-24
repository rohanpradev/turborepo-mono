import { expect, test } from "bun:test";
import { parseResources } from "../scripts/helm-profile-policy";

test.skipIf(!Bun.which("helm"))(
  "migration and health pods honor the same node placement and registry access as applications",
  () => {
    const nodeSelector = { pool: "commerce" };
    const tolerations = [
      {
        key: "dedicated",
        operator: "Equal",
        value: "commerce",
        effect: "NoSchedule",
      },
    ];
    const affinity = {
      nodeAffinity: {
        requiredDuringSchedulingIgnoredDuringExecution: {
          nodeSelectorTerms: [
            {
              matchExpressions: [
                { key: "pool", operator: "In", values: ["commerce"] },
              ],
            },
          ],
        },
      },
    };
    const imagePullSecrets = [{ name: "private-registry" }];
    const result = Bun.spawnSync([
      "helm",
      "template",
      "placement-test",
      "charts/ecommerce",
      "--set",
      "global.priorityClassName=commerce",
      ...Object.entries({
        nodeSelector,
        tolerations,
        affinity,
        imagePullSecrets,
      }).flatMap(([key, value]) => [
        "--set-json",
        `global.${key}=${JSON.stringify(value)}`,
      ]),
    ]);
    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);
    const pods = parseResources(result.stdout.toString()).flatMap(
      (resource) => {
        const spec = resource.spec as {
          template?: { spec: Record<string, unknown> };
        };
        if (resource.kind === "Deployment" || resource.kind === "Job")
          return spec.template ? [spec.template.spec] : [];
        return resource.kind === "Pod" ? [spec] : [];
      },
    );
    expect(pods).toHaveLength(9);
    for (const pod of pods) {
      expect(pod).toMatchObject({
        nodeSelector,
        tolerations,
        affinity,
        imagePullSecrets,
        priorityClassName: "commerce",
        automountServiceAccountToken: false,
      });
    }
  },
);

test.skipIf(!Bun.which("helm"))(
  "a chart-created Gateway permits only its release namespace by default",
  () => {
    const result = Bun.spawnSync([
      "helm",
      "template",
      "gateway-test",
      "charts/ecommerce",
      "--namespace",
      "storefront",
      "--set",
      "ingress.enabled=false,gateway.enabled=true,gateway.create=true",
    ]);
    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);
    const resources = parseResources(result.stdout.toString());
    const gateway = resources.find(({ kind }) => kind === "Gateway");
    expect(gateway?.metadata).toMatchObject({ namespace: "traefik" });
    expect(gateway?.spec).toMatchObject({
      listeners: [
        {
          allowedRoutes: {
            namespaces: {
              from: "Selector",
              selector: {
                matchLabels: { "kubernetes.io/metadata.name": "storefront" },
              },
            },
          },
        },
      ],
    });
  },
);

test.skipIf(!Bun.which("helm"))(
  "Gateway listeners preserve an explicitly configured route policy",
  () => {
    const allowedRoutes = { namespaces: { from: "Same" } };
    const result = Bun.spawnSync([
      "helm",
      "template",
      "gateway-test",
      "charts/ecommerce",
      "--set",
      "ingress.enabled=false,gateway.enabled=true,gateway.create=true,gateway.namespace=storefront,gateway.sectionName=http",
      "--set-json",
      `gateway.listeners=${JSON.stringify([
        { name: "http", port: 8080, protocol: "HTTP", allowedRoutes },
      ])}`,
    ]);
    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);
    const gateway = parseResources(result.stdout.toString()).find(
      ({ kind }) => kind === "Gateway",
    );
    expect(gateway?.spec).toMatchObject({
      listeners: [{ allowedRoutes }],
    });
  },
);

test.skipIf(!Bun.which("helm"))(
  "long releases retain unique resource names and matching service references",
  () => {
    const result = Bun.spawnSync([
      "helm",
      "template",
      `commerce-${"x".repeat(44)}`,
      "charts/ecommerce",
      "--set",
      "ingress.enabled=false,gateway.enabled=true,stripeCli.enabled=true,networkPolicy.enabled=true",
      "--set",
      "observability.serviceMonitor.enabled=true,observability.prometheusRule.enabled=true,observability.grafanaDashboard.enabled=true",
      "--set",
      "services.product.service.port=9000",
    ]);
    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);
    const resources = parseResources(result.stdout.toString());
    const identities = resources.map((resource) => {
      const metadata = resource.metadata as { name: string };
      expect(metadata.name.length).toBeLessThanOrEqual(63);
      return `${resource.kind}:${metadata.name}`;
    });
    expect(new Set(identities).size).toBe(resources.length);
    const productService = resources.find(
      (resource) =>
        resource.kind === "Service" &&
        (resource.metadata as { labels: Record<string, string> }).labels[
          "app.kubernetes.io/component"
        ] === "product-service",
    );
    if (!productService) throw new Error("Product Service was not rendered.");
    const productName = (productService.metadata as { name: string }).name;
    expect(productName).toMatch(/-product-service-[a-f0-9]{8}$/);
    for (const deployment of resources.filter(
      ({ kind }) => kind === "Deployment",
    )) {
      const spec = deployment.spec as {
        template: {
          spec: {
            containers: Array<{
              env: Array<{ name: string; value?: string }>;
            }>;
          };
        };
      };
      for (const container of spec.template.spec.containers) {
        const productUrl = container.env.find(
          ({ name }) => name === "PRODUCT_SERVICE_INTERNAL_URL",
        );
        if (productUrl)
          expect(productUrl.value).toBe(`http://${productName}:9000`);
      }
    }
  },
);
