import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
