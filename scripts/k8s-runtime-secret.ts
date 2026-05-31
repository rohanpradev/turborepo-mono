type SecretEntry = {
  key: string;
  required?: boolean;
  sources: Array<string>;
};

const cwd = new URL("..", import.meta.url).pathname;

const args = process.argv.slice(2);

const getArg = (name: string, fallback: string) => {
  const index = args.indexOf(name);

  if (index !== -1) {
    return args[index + 1] ?? fallback;
  }

  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));

  return inline ? inline.slice(prefix.length) : fallback;
};

const unescapeQuotedValue = (value: string) =>
  value.replace(/\\([nrt"\\])/g, (_, escaped: string) => {
    switch (escaped) {
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      default:
        return escaped;
    }
  });

const parseDotenv = (contents: string) => {
  const env = new Map<string, string>();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalizedLine = line.startsWith("export ")
      ? line.slice("export ".length).trimStart()
      : line;
    const separatorIndex = normalizedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    const rawValue = normalizedLine.slice(separatorIndex + 1).trim();

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid environment key: ${key}`);
    }

    const quote = rawValue[0];

    if ((quote === '"' || quote === "'") && rawValue.endsWith(quote)) {
      const quotedValue = rawValue.slice(1, -1);
      env.set(
        key,
        quote === '"' ? unescapeQuotedValue(quotedValue) : quotedValue,
      );
      continue;
    }

    env.set(key, rawValue.replace(/\s+#.*$/, "").trim());
  }

  return env;
};

const selectedSecrets: Array<SecretEntry> = [
  {
    key: "DATABASE_URL",
    required: true,
    sources: ["K8S_DATABASE_URL", "DATABASE_URL"],
  },
  { key: "MONGO_URL", required: true, sources: ["K8S_MONGO_URL", "MONGO_URL"] },
  { key: "STRIPE_SECRET_KEY", sources: ["STRIPE_SECRET_KEY"] },
  { key: "STRIPE_WEBHOOK_SECRET", sources: ["STRIPE_WEBHOOK_SECRET"] },
  {
    key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    sources: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
  },
  { key: "CLERK_PUBLISHABLE_KEY", sources: ["CLERK_PUBLISHABLE_KEY"] },
  {
    key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    sources: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
  },
  { key: "CLERK_SECRET_KEY", sources: ["CLERK_SECRET_KEY"] },
  { key: "ADMIN_USER_IDS", sources: ["ADMIN_USER_IDS"] },
];

const firstValue = (env: Map<string, string>, sources: Array<string>) => {
  for (const source of sources) {
    const value = env.get(source);

    if (value) {
      return value;
    }
  }

  return "";
};

const yamlValue = (value: string) => JSON.stringify(value);

const envFile = getArg("--env-file", ".env");
const name = getArg("--name", "ecommerce-runtime");
const namespace = getArg("--namespace", "ecommerce");
const contents = await Bun.file(`${cwd}/${envFile}`).text();
const env = parseDotenv(contents);
const stringData = new Map(
  selectedSecrets.map(({ key, sources }) => [key, firstValue(env, sources)]),
);
const missingRequired = selectedSecrets
  .filter(({ key, required }) => required && !stringData.get(key))
  .map(({ key }) => key);

if (missingRequired.length > 0) {
  throw new Error(
    `Missing required Kubernetes secret values: ${missingRequired.join(", ")}`,
  );
}

const placeholderKeys = selectedSecrets
  .filter(({ key }) => /^your_|_here$/.test(stringData.get(key) ?? ""))
  .map(({ key }) => key);

if (placeholderKeys.length > 0) {
  console.warn(
    `Warning: placeholder values remain in Kubernetes secret keys: ${placeholderKeys.join(", ")}`,
  );
}

const lines = [
  "apiVersion: v1",
  "kind: Secret",
  "metadata:",
  `  name: ${yamlValue(name)}`,
  `  namespace: ${yamlValue(namespace)}`,
  "type: Opaque",
  "stringData:",
];

for (const [key, value] of stringData) {
  lines.push(`  ${key}: ${yamlValue(value)}`);
}

console.log(lines.join("\n"));
