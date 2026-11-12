import { expect, test } from "bun:test";
import {
  assertProfilePolicy,
  parseResources,
} from "../scripts/helm-profile-policy";

type SecretRef = { name: string; key: string };
const podSecretRefs = (spec: unknown) =>
  (
    spec as {
      template: {
        spec: {
          containers: {
            env?: { valueFrom?: { secretKeyRef?: SecretRef } }[];
          }[];
        };
      };
    }
  ).template.spec.containers.flatMap(({ env }) =>
    (env ?? []).flatMap(({ valueFrom }) =>
      valueFrom?.secretKeyRef ? [valueFrom.secretKeyRef] : [],
    ),
  );

for (const environment of ["staging", "production"]) {
  test(`${environment} requires pinned images and separates migration credentials from runtime`, () => {
    const args = [
      "helm",
      "template",
      "audit",
      "charts/ecommerce",
      "--kube-version",
      "1.36.5",
      "-f",
      `deploy/environments/${environment}/ecommerce.values.yaml`,
    ];
    const unconfigured = Bun.spawnSync(args);
    expect(unconfigured.exitCode).not.toBe(0);
    expect(unconfigured.stderr.toString()).toContain(
      "verified sha256 image digest",
    );
    args.push("-f", "charts/ecommerce/ci/hosted-image-fixtures.yaml");
    const rendered = Bun.spawnSync(args);
    expect(rendered.stderr.toString()).toBe("");
    expect(rendered.exitCode).toBe(0);
    const manifest = rendered.stdout.toString();
    assertProfilePolicy(
      manifest,
      {
        name: environment,
        requiredKind: "Ingress",
        forbiddenKind: "HTTPRoute",
      },
      "1.36.5",
    );
    const resources = parseResources(manifest);
    expect(resources.filter((r) => r.kind === "NetworkPolicy")).toHaveLength(5);
    const jobs = resources.filter((r) => r.kind === "Job");
    const deployments = resources.filter((r) => r.kind === "Deployment");
    expect(jobs).toHaveLength(3);
    expect(deployments).toHaveLength(5);
    expect(
      jobs
        .flatMap((job) => podSecretRefs(job.spec))
        .sort((a, b) => a.key.localeCompare(b.key)),
    ).toEqual(
      ["DATABASE_URL", "MONGO_URL", "PAYMENT_DATABASE_URL"].map((key) => ({
        name: `commerce-${environment}-migrations`,
        key,
      })),
    );
    for (const deployment of deployments) {
      const refs = podSecretRefs(deployment.spec);
      expect(refs.length).toBeGreaterThan(0);
      expect(new Set(refs.map(({ name }) => name))).toEqual(
        new Set([`commerce-${environment}-runtime`]),
      );
    }
    const invalid = Bun.spawnSync([
      ...args,
      "--set",
      "secrets.create=true",
      "--set",
      `jobs.migrate-product-db.secretName=commerce-${environment}-runtime`,
    ]);
    expect(invalid.exitCode).not.toBe(0);
    expect(invalid.stderr.toString()).toContain(
      "requires an externally managed secret",
    );
  });
}
