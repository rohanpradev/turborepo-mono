import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");

const runWithDockerFixture = async (service: string, failure = 0) => {
  const directory = await mkdtemp(path.join(tmpdir(), "container-runtime-"));
  const log = path.join(directory, "calls.jsonl");
  try {
    await writeFile(
      path.join(directory, "docker"),
      `#!${process.execPath}
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.DOCKER_FIXTURE_LOG, JSON.stringify(args) + "\\n");
if (args[0] === "run" && args.includes("--detach")) console.log("fixture-container");
if (args[0] === "exec") process.exit(Number(process.env.DOCKER_FIXTURE_FAILURE));
`,
      { mode: 0o755 },
    );
    const child = Bun.spawn(
      ["bash", "docker/test-image.sh", service, "fixture/image:test"],
      {
        cwd: root,
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          DOCKER_FIXTURE_LOG: log,
          DOCKER_FIXTURE_FAILURE: String(failure),
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [exitCode, stderr] = await Promise.all([
      child.exited,
      new Response(child.stderr).text(),
      new Response(child.stdout).text(),
    ]);
    const calls = (await readFile(log, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]);
    return { calls, exitCode, stderr };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

test("container verification runs with production restrictions and removes web containers", async () => {
  const { calls, exitCode, stderr } = await runWithDockerFixture("client");
  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
  expect(calls[0]).toEqual(
    expect.arrayContaining([
      "--read-only",
      "65532:65532",
      "--cap-drop",
      "ALL",
      "no-new-privileges",
      "--network",
      "none",
      "/app/apps/client/.next/cache:rw,nosuid,size=256m,mode=1777",
    ]),
  );
  expect(calls.at(-1)).toEqual(["rm", "--force", "fixture-container"]);
  expect(calls.some(([command]) => command === "logs")).toBe(false);
});

test("failed image verification preserves the failure and collects logs before cleanup", async () => {
  const { calls, exitCode } = await runWithDockerFixture("admin", 23);
  expect(exitCode).toBe(23);
  expect(calls.slice(-2)).toEqual([
    ["logs", "fixture-container"],
    ["rm", "--force", "fixture-container"],
  ]);
});

test("CI loads and verifies the image before publishing with identical build inputs", async () => {
  const workflow = Bun.YAML.parse(
    await Bun.file(path.join(root, ".github/workflows/ci.yml")).text(),
  ) as {
    jobs: Record<
      string,
      {
        steps: {
          name: string;
          if?: string;
          run?: string;
          with?: Record<string, unknown>;
        }[];
      }
    >;
  };
  const steps = workflow.jobs["docker-images"]?.steps;
  if (!steps) throw new Error("Docker image job is missing");
  const build = steps.findIndex((step) => step.with?.load === true);
  const verify = steps.findIndex((step) =>
    step.run?.includes("docker/test-image.sh"),
  );
  const publish = steps.findIndex((step) => step.with?.push === true);
  expect(build).toBeGreaterThan(-1);
  expect(verify).toBeGreaterThan(build);
  expect(publish).toBeGreaterThan(verify);
  expect(steps[build]?.with?.push).toBe(false);
  expect(steps[publish]?.if).toBe("env.PUBLISH_IMAGES == 'true'");
  expect(steps[publish]?.with?.["build-args"]).toBe(
    steps[build]?.with?.["build-args"],
  );
  expect(steps[publish]?.with?.provenance).toBe("mode=max");
  expect(steps[publish]?.with?.sbom).toBe(true);
});

test("disposable integration dependencies use the same exact database images as CI", async () => {
  const compose = Bun.YAML.parse(
    await Bun.file(path.join(root, "compose.integration.yml")).text(),
  ) as {
    services: Record<
      string,
      {
        image: string;
        healthcheck: { test: string[] };
        environment: Record<string, string>;
        ports: string[];
      }
    >;
  };
  const workflow = Bun.YAML.parse(
    await Bun.file(path.join(root, ".github/workflows/ci.yml")).text(),
  ) as {
    jobs: Record<string, { services: Record<string, { image: string }> }>;
  };
  const services = workflow.jobs["database-integration"]?.services;
  if (!services) throw new Error("Database integration job is missing");
  expect(compose.services.postgres?.image).toBe(services.postgres?.image);
  expect(compose.services.mongo?.image).toBe(services.mongodb?.image);
  expect(compose.services.kafka?.image).toBe(services.kafka?.image);
  // An open socket alone does not establish that Kafka can answer metadata requests.
  expect(compose.services.kafka?.healthcheck.test).toContain(
    "/opt/kafka/bin/kafka-topics.sh",
  );
  // Internal probes must not receive the host-only advertised port in metadata.
  expect(compose.services.kafka?.environment.KAFKA_ADVERTISED_LISTENERS).toBe(
    "INTERNAL://kafka:9092,EXTERNAL://127.0.0.1:59092",
  );
  expect(
    compose.services.kafka?.environment.KAFKA_INTER_BROKER_LISTENER_NAME,
  ).toBe("INTERNAL");
  expect(compose.services.kafka?.ports).toEqual(["127.0.0.1:59092:9094"]);
});
