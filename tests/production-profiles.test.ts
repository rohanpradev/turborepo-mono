import { expect, test } from "bun:test";
import { parseResources } from "../scripts/helm-profile-policy";

for (const environment of ["staging", "production"]) {
  test(`${environment} template rejects unpinned images and renders isolation with explicit fixtures`, () => {
    const args = [
      "helm",
      "template",
      "audit",
      "charts/ecommerce",
      "-f",
      `deploy/environments/${environment}/ecommerce.values.yaml`,
    ];
    const unconfigured = Bun.spawnSync(args);
    expect(unconfigured.exitCode).not.toBe(0);
    expect(unconfigured.stderr.toString()).toContain(
      "verified sha256 image digest",
    );
    const digest = `sha256:${"a".repeat(64)}`; // Render fixture only; never a published image.
    for (const service of ["product", "order", "payment", "client", "admin"])
      args.push("--set", `services.${service}.image.digest=${digest}`);
    const rendered = Bun.spawnSync(args);
    expect(rendered.stderr.toString()).toBe("");
    expect(rendered.exitCode).toBe(0);
    const resources = parseResources(rendered.stdout.toString());
    expect(resources.filter((r) => r.kind === "NetworkPolicy")).toHaveLength(5);
    expect(resources.filter((r) => r.kind === "Job")).toHaveLength(3); // Product/payment migrations and order indexes.
    expect(rendered.stdout.toString()).not.toContain(
      "allowExternalEgress: true",
    );
  });
}
