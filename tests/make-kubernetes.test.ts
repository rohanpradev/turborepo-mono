import { expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const withTools = (run: (directory: string) => void) => {
  const directory = mkdtempSync(join(tmpdir(), "ecommerce-make-"));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

const tool = (directory: string, name: string, script: string) => {
  const path = join(directory, name);
  writeFileSync(path, `#!/bin/sh\n${script}\n`, { mode: 0o700 });
  return path;
};

test("manifest validation stops when Helm rendering fails", () => {
  withTools((directory) => {
    const helm = tool(
      directory,
      "helm",
      'case "$1" in lint) exit 0;; *) exit 42;; esac',
    );
    tool(directory, "docker", "echo SCHEMA_VALIDATION_RAN; exit 0");
    const result = Bun.spawnSync(
      [
        "make",
        "--no-print-directory",
        "k8s-validate",
        `HELM=${helm}`,
        `RUNTIME_DIR=${directory}`,
        "NO_COLOR=1",
      ],
      { env: { ...process.env, PATH: `${directory}:${process.env.PATH}` } },
    );
    expect(result.exitCode).not.toBe(0);
    expect(new TextDecoder().decode(result.stdout)).not.toContain(
      "SCHEMA_VALIDATION_RAN",
    );
    expect(new TextDecoder().decode(result.stdout)).not.toContain(
      "Kubernetes manifests validated",
    );
  });
});

test("minikube image loading stops at the first failed import", () => {
  withTools((directory) => {
    const kubectl = tool(directory, "kubectl", "echo minikube");
    tool(directory, "minikube", 'echo "IMPORT:$3"; test "$3" != "broken:dev"');
    const result = Bun.spawnSync(
      [
        "make",
        "--no-print-directory",
        "k8s-load-images",
        `KUBECTL=${kubectl}`,
        "K8S_LOCAL_IMAGES=broken:dev good:dev",
        "NO_COLOR=1",
      ],
      { env: { ...process.env, PATH: `${directory}:${process.env.PATH}` } },
    );
    expect(result.exitCode).not.toBe(0);
    expect(new TextDecoder().decode(result.stdout)).toContain(
      "IMPORT:broken:dev",
    );
    expect(new TextDecoder().decode(result.stdout)).not.toContain(
      "IMPORT:good:dev",
    );
  });
});

for (const scenario of [
  { name: "invalid replacement", generate: 42, lookup: 0, owner: "", apply: 0 },
  { name: "lookup failure", generate: 0, lookup: 42, owner: "", apply: 0 },
  {
    name: "Helm-owned secret",
    generate: 0,
    lookup: 0,
    owner: "ecommerce",
    apply: 0,
  },
  {
    name: "another release's secret",
    generate: 0,
    lookup: 0,
    owner: "other",
    apply: 0,
  },
  { name: "apply failure", generate: 0, lookup: 0, owner: "", apply: 42 },
  { name: "external secret", generate: 0, lookup: 0, owner: "", apply: 0 },
]) {
  test(`runtime secret synchronization handles ${scenario.name} without deletion`, () => {
    withTools((directory) => {
      // Exercise only the real synchronization recipe, without cluster setup.
      const makefile = join(directory, "test.mk");
      writeFileSync(
        makefile,
        `SHELL := /bin/bash\n.SHELLFLAGS := -o pipefail -c\ninclude ${process.cwd()}/make/kubernetes.mk\n`,
      );
      tool(directory, "mktemp", 'exec /usr/bin/mktemp "$TMPDIR/secret.XXXXXX"');
      tool(
        directory,
        "bun",
        `echo SYNTHETIC_SECRET_PAYLOAD; exit ${scenario.generate}`,
      );
      const kubectl = tool(
        directory,
        "kubectl",
        `echo "KUBECTL:$*" >&2
case "$*" in
  *"get secret"*) echo '${scenario.owner}'; exit ${scenario.lookup};;
  "apply -f "*)
    test -f "$3" || exit 43
    test "$(find "$3" -perm 600)" = "$3" || exit 44
    grep -q '^SYNTHETIC_SECRET_PAYLOAD$' "$3" || exit 45
    exit ${scenario.apply};;
  *) exit 46;;
esac`,
      );
      const result = Bun.spawnSync(
        [
          "make",
          "--no-print-directory",
          "-f",
          makefile,
          "-o",
          "ensure-env",
          "-o",
          "k8s-namespace",
          "k8s-runtime-secret",
          `KUBECTL=${kubectl}`,
          "HELM_NAMESPACE=isolated-test",
          "HELM_RUNTIME_SECRET=runtime",
        ],
        {
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            TMPDIR: directory,
          },
        },
      );
      const output =
        new TextDecoder().decode(result.stdout) +
        new TextDecoder().decode(result.stderr);
      const shouldApply =
        !scenario.generate && !scenario.lookup && !scenario.owner;
      expect(result.exitCode === 0).toBe(shouldApply && !scenario.apply);
      expect(output.includes("KUBECTL:apply")).toBe(shouldApply);
      expect(output).not.toContain("delete secret");
      expect(output).not.toContain("SYNTHETIC_SECRET_PAYLOAD");
      if (scenario.generate) expect(output).not.toContain("KUBECTL:");
      expect(
        readdirSync(directory).filter((file) => file.startsWith("secret.")),
      ).toEqual([]);
    });
  });
}
