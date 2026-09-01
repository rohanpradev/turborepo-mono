import { describe, expect, test } from "bun:test";
import {
  assertProfilePolicy,
  findImageReferences,
  parseResources,
  usesLatestTag,
} from "../scripts/helm-profile-policy";

const profile = {
  forbiddenKind: "HTTPRoute",
  name: "ingress",
  requiredKind: "Ingress",
};

const manifest = `
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: storefront
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storefront
spec:
  template:
    spec:
      containers:
        - name: storefront
          image: registry.example.com/storefront:1.2.3
`;

describe("Helm profile policy", () => {
  test("parses multi-document Kubernetes YAML", () => {
    expect(parseResources(manifest).map(({ kind }) => kind)).toEqual([
      "Ingress",
      "Deployment",
    ]);
  });

  test("finds nested image fields", () => {
    const resources = parseResources(manifest);

    expect(findImageReferences(resources)).toEqual([
      {
        image: "registry.example.com/storefront:1.2.3",
        path: "$[1].spec.template.spec.containers[0].image",
      },
    ]);
  });

  test("detects explicit latest tags without false positives", () => {
    expect(usesLatestTag("storefront:latest")).toBe(true);
    expect(usesLatestTag("registry:5000/storefront:latest@sha256:abc")).toBe(
      true,
    );
    expect(usesLatestTag("storefront:latest-security")).toBe(false);
    expect(usesLatestTag("registry:5000/storefront@sha256:abc")).toBe(false);
  });

  test("accepts the expected resource contract", () => {
    expect(assertProfilePolicy(manifest, profile, "1.36.4")).toBe(2);
  });

  test("rejects forbidden resource kinds", () => {
    const invalidManifest = `${manifest}
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: storefront
`;

    expect(() =>
      assertProfilePolicy(invalidManifest, profile, "1.36.4"),
    ).toThrow("must not render HTTPRoute");
  });

  test("rejects latest image tags", () => {
    const invalidManifest = manifest.replace(":1.2.3", ":latest");

    expect(() =>
      assertProfilePolicy(invalidManifest, profile, "1.36.4"),
    ).toThrow("forbidden latest image tags");
  });
});
