import { fileURLToPath } from "node:url";

type HelmProfile = {
  forbiddenKind: string;
  name: string;
  requiredKind: string;
  valuesFile: string;
};

type ImageReference = {
  image: string;
  path: string;
};

type KubernetesResource = Record<string, unknown> & {
  kind?: string;
};

const profiles: Array<HelmProfile> = [
  {
    name: "ingress",
    valuesFile: "charts/ecommerce/ci/ingress-values.yaml",
    requiredKind: "Ingress",
    forbiddenKind: "HTTPRoute",
  },
  {
    name: "gateway",
    valuesFile: "charts/ecommerce/ci/gateway-values.yaml",
    requiredKind: "HTTPRoute",
    forbiddenKind: "Ingress",
  },
  {
    name: "local",
    valuesFile: "deploy/environments/local/ecommerce.values.yaml",
    requiredKind: "Ingress",
    forbiddenKind: "HTTPRoute",
  },
  {
    name: "local-full",
    valuesFile: "deploy/environments/local/ecommerce-full.values.yaml",
    requiredKind: "Ingress",
    forbiddenKind: "HTTPRoute",
  },
];

const decoder = new TextDecoder();
const cwd = fileURLToPath(new URL("..", import.meta.url));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseResources = (manifest: string): Array<KubernetesResource> => {
  const parsed = Bun.YAML.parse(manifest) as unknown;
  const documents = Array.isArray(parsed) ? parsed : [parsed];

  return documents.filter(isRecord);
};

export const usesLatestTag = (image: string) => {
  const reference = image.split("@", 1)[0] ?? "";
  const lastSlash = reference.lastIndexOf("/");
  const lastColon = reference.lastIndexOf(":");

  return lastColon > lastSlash && reference.slice(lastColon + 1) === "latest";
};

export const findImageReferences = (
  value: unknown,
  path = "$",
): Array<ImageReference> => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findImageReferences(item, `${path}[${index}]`),
    );
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    const current =
      key === "image" && typeof child === "string"
        ? [{ image: child, path: childPath }]
        : [];

    return [...current, ...findImageReferences(child, childPath)];
  });
};

const record = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};

const selectorMatches = (
  selector: Record<string, unknown>,
  labels: Record<string, unknown>,
) => {
  if (
    !Object.entries(record(selector.matchLabels)).every(
      ([key, value]) => labels[key] === value,
    )
  )
    return false;
  const expressions = Array.isArray(selector.matchExpressions)
    ? selector.matchExpressions
    : [];
  return expressions.every((value) => {
    const expression = record(value);
    const key = String(expression.key);
    const values = Array.isArray(expression.values) ? expression.values : [];
    switch (expression.operator) {
      case "DoesNotExist":
        return !(key in labels);
      case "Exists":
        return key in labels;
      case "In":
        return values.includes(labels[key]);
      case "NotIn":
        return !values.includes(labels[key]);
      default:
        throw new Error(
          `Unsupported selector operator: ${expression.operator}`,
        );
    }
  });
};

const assertJobBudgetIsolation = (resources: Array<KubernetesResource>) => {
  for (const job of resources.filter(({ kind }) => kind === "Job")) {
    const labels = record(
      record(record(record(job.spec).template).metadata).labels,
    );
    for (const budget of resources.filter(
      ({ kind }) => kind === "PodDisruptionBudget",
    )) {
      const selector = record(budget.spec).selector;
      // A null policy/v1 selector selects nothing; an empty selector selects everything.
      if (isRecord(selector) && selectorMatches(selector, labels)) {
        throw new Error(
          `Job ${record(job.metadata).name} must not be selected by PodDisruptionBudget ${record(budget.metadata).name}.`,
        );
      }
    }
  }
};

export const assertProfilePolicy = (
  manifest: string,
  profile: Pick<HelmProfile, "forbiddenKind" | "name" | "requiredKind">,
  kubernetesVersion: string,
) => {
  const resources = parseResources(manifest);

  if (resources.length === 0) {
    throw new Error(
      `${profile.name} rendered no resources for Kubernetes ${kubernetesVersion}.`,
    );
  }

  const kinds = new Set(resources.map(({ kind }) => kind).filter(Boolean));

  if (!kinds.has(profile.requiredKind)) {
    throw new Error(
      `${profile.name} must render ${profile.requiredKind} for Kubernetes ${kubernetesVersion}.`,
    );
  }

  if (kinds.has(profile.forbiddenKind)) {
    throw new Error(
      `${profile.name} must not render ${profile.forbiddenKind} for Kubernetes ${kubernetesVersion}.`,
    );
  }

  const latestImages = resources
    .flatMap((resource, index) => findImageReferences(resource, `$[${index}]`))
    .filter(({ image }) => usesLatestTag(image));

  if (latestImages.length > 0) {
    const details = latestImages
      .map(({ image, path }) => `${path}=${image}`)
      .join(", ");
    throw new Error(
      `${profile.name} uses forbidden latest image tags for Kubernetes ${kubernetesVersion}: ${details}.`,
    );
  }

  assertJobBudgetIsolation(resources);
  return resources.length;
};

const renderProfile = (profile: HelmProfile, kubernetesVersion: string) => {
  const result = Bun.spawnSync(
    [
      "helm",
      "template",
      "ecommerce",
      "charts/ecommerce",
      "--namespace",
      "ecommerce",
      "--kube-version",
      kubernetesVersion,
      "--values",
      profile.valuesFile,
    ],
    {
      cwd,
      stderr: "pipe",
      stdout: "pipe",
    },
  );

  if (result.exitCode !== 0) {
    throw new Error(
      `Helm failed for ${profile.name} on Kubernetes ${kubernetesVersion}: ${decoder.decode(result.stderr).trim()}`,
    );
  }

  return decoder.decode(result.stdout);
};

const main = () => {
  const kubernetesVersions = process.argv
    .slice(2)
    .filter((argument) => argument !== "--");

  if (kubernetesVersions.length === 0) {
    throw new Error(
      "Pass at least one Kubernetes version, for example: bun run helm:assert-profiles -- 1.36.4.",
    );
  }

  for (const kubernetesVersion of kubernetesVersions) {
    for (const profile of profiles) {
      const manifest = renderProfile(profile, kubernetesVersion);
      const resourceCount = assertProfilePolicy(
        manifest,
        profile,
        kubernetesVersion,
      );
      console.log(
        `Validated ${profile.name} for Kubernetes ${kubernetesVersion} (${resourceCount} resources).`,
      );
    }
  }

  console.log("All Helm profile policies passed.");
};

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
