type CheckStatus = "pass" | "warn" | "fail";

type CheckResult = {
  detail: string;
  name: string;
  status: CheckStatus;
};

type PackageJson = {
  engines?: {
    bun?: string;
    node?: string;
  };
  packageManager?: string;
};

const decoder = new TextDecoder();
const cwd = new URL("..", import.meta.url).pathname;

const run = (command: Array<string>) => {
  const result = Bun.spawnSync(command, {
    cwd,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      TURBO_TELEMETRY_DISABLED: "1",
    },
    stderr: "pipe",
    stdout: "pipe",
  });

  return {
    exitCode: result.exitCode,
    output: `${decoder.decode(result.stdout)}${decoder.decode(result.stderr)}`,
  };
};

const readJson = async <T>(path: string) => (await Bun.file(path).json()) as T;

const fileExists = async (path: string) => await Bun.file(path).exists();

const parseEnvFile = async (path: string) => {
  if (!(await fileExists(path))) {
    return new Map<string, string>();
  }

  const entries = (await Bun.file(path).text())
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      return separatorIndex === -1
        ? ([line, ""] as const)
        : ([
            line.slice(0, separatorIndex),
            line.slice(separatorIndex + 1),
          ] as const);
    });

  return new Map(entries);
};

const minimumVersion = (range?: string) =>
  range?.match(/\d+\.\d+\.\d+/)?.[0] ?? null;

const compareVersions = (actual: string, expected: string) => {
  const actualParts = actual.split(".").map(Number);
  const expectedParts = expected.split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    const actualPart = actualParts[index] ?? 0;
    const expectedPart = expectedParts[index] ?? 0;

    if (actualPart > expectedPart) {
      return 1;
    }

    if (actualPart < expectedPart) {
      return -1;
    }
  }

  return 0;
};

const checkRuntimeVersion = (
  name: string,
  actualVersion: string | null,
  requiredRange?: string,
): CheckResult => {
  const requiredVersion = minimumVersion(requiredRange);

  if (!actualVersion || !requiredVersion) {
    return {
      name,
      status: "warn",
      detail: `Could not compare against range ${requiredRange ?? "unknown"}.`,
    };
  }

  const normalizedActual = actualVersion.replace(/^v/, "");

  return compareVersions(normalizedActual, requiredVersion) >= 0
    ? {
        name,
        status: "pass",
        detail: `${normalizedActual} satisfies ${requiredRange}.`,
      }
    : {
        name,
        status: "fail",
        detail: `${normalizedActual} does not satisfy ${requiredRange}.`,
      };
};

const requiredEnvKeys = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "DATABASE_URL",
  "MONGO_URL",
  "KAFKA_BROKERS",
  "NEXT_PUBLIC_PRODUCT_SERVICE_URL",
  "NEXT_PUBLIC_ORDER_SERVICE_URL",
  "NEXT_PUBLIC_PAYMENT_SERVICE_URL",
] as const;

const placeholderPattern = /your_|_here$/;

const checkEnvironment = async (): Promise<CheckResult> => {
  const envExists = await fileExists(".env");

  if (!envExists) {
    return {
      name: "Environment file",
      status: "warn",
      detail: ".env is missing. Run make setup to create it from .env.example.",
    };
  }

  const env = await parseEnvFile(".env");
  const missingKeys = requiredEnvKeys.filter((key) => !env.has(key));
  const placeholderKeys = requiredEnvKeys.filter((key) =>
    placeholderPattern.test(env.get(key) ?? ""),
  );

  if (missingKeys.length > 0) {
    return {
      name: "Environment file",
      status: "fail",
      detail: `Missing required keys: ${missingKeys.join(", ")}.`,
    };
  }

  if (placeholderKeys.length > 0) {
    return {
      name: "Environment file",
      status: "warn",
      detail: `Placeholder values remain for: ${placeholderKeys.join(", ")}.`,
    };
  }

  return {
    name: "Environment file",
    status: "pass",
    detail: ".env contains the expected runtime keys.",
  };
};

const commandCheck = (
  name: string,
  command: Array<string>,
  passDetail: string,
  failDetail: (output: string) => string,
): CheckResult => {
  const result = run(command);

  return result.exitCode === 0
    ? {
        name,
        status: "pass",
        detail: passDetail,
      }
    : {
        name,
        status: "fail",
        detail: failDetail(result.output),
      };
};

const optionalCommandCheck = (
  name: string,
  command: Array<string>,
  passDetail: string,
  warnDetail: (output: string) => string,
): CheckResult => {
  const result = run(command);

  return result.exitCode === 0
    ? {
        name,
        status: "pass",
        detail: passDetail,
      }
    : {
        name,
        status: "warn",
        detail: warnDetail(result.output),
      };
};

const summarizeOutput = (output: string) =>
  output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ");

const main = async () => {
  const packageJson = await readJson<PackageJson>("package.json");
  const nodeVersion = run(["node", "--version"]);
  const dockerVersion = run(["docker", "--version"]);

  const checks: Array<CheckResult> = [
    checkRuntimeVersion("Bun", Bun.version, packageJson.engines?.bun),
    checkRuntimeVersion(
      "Node",
      nodeVersion.exitCode === 0 ? nodeVersion.output.trim() : null,
      packageJson.engines?.node,
    ),
    {
      name: "Package manager",
      status:
        packageJson.packageManager === `bun@${Bun.version}` ? "pass" : "warn",
      detail:
        packageJson.packageManager === `bun@${Bun.version}`
          ? `Using ${packageJson.packageManager}.`
          : `packageManager is ${packageJson.packageManager ?? "unset"}, current Bun is ${Bun.version}.`,
    },
    await checkEnvironment(),
    dockerVersion.exitCode === 0
      ? {
          name: "Docker CLI",
          status: "pass",
          detail: dockerVersion.output.trim(),
        }
      : {
          name: "Docker CLI",
          status: "warn",
          detail: "Docker is not available on PATH.",
        },
    commandCheck(
      "Dependency policy",
      ["bun", "run", "deps:check"],
      "Workspace dependency versions match the root catalog policy.",
      (output) => `Syncpack reported issues. ${summarizeOutput(output)}`,
    ),
    commandCheck(
      "Compose config",
      ["docker", "compose", "--env-file", ".env", "config"],
      "Root Docker Compose file renders successfully.",
      (output) => `Compose validation failed. ${summarizeOutput(output)}`,
    ),
    commandCheck(
      "Kafka compose config",
      ["docker", "compose", "-f", "packages/kafka/compose.yml", "config"],
      "Standalone Kafka Compose file renders successfully.",
      (output) => `Kafka Compose validation failed. ${summarizeOutput(output)}`,
    ),
    optionalCommandCheck(
      "Official Bun runtime image",
      [
        "docker",
        "pull",
        "oven/bun:1.4.0@sha256:5ff609364c049b54eb0ff560ec96319729a972078ef2c755d758f0c6ef89c2d6",
      ],
      "Bun 1.4 runtime image can be pulled.",
      (output) =>
        `Bun runtime image pull is not ready. ${summarizeOutput(output)}`,
    ),
  ];

  const labelByStatus: Record<CheckStatus, string> = {
    fail: "FAIL",
    pass: "PASS",
    warn: "WARN",
  };

  console.log("Commerce platform doctor\n");

  for (const check of checks) {
    console.log(`[${labelByStatus[check.status]}] ${check.name}`);
    console.log(`       ${check.detail}`);
  }

  const failures = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  console.log(
    `\nSummary: ${checks.length - failures.length - warnings.length} passed, ${warnings.length} warnings, ${failures.length} failures.`,
  );

  if (failures.length > 0) {
    process.exit(1);
  }
};

await main();
