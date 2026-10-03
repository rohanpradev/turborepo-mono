// Explicit, disposable databases keep integration tests away from app data.
const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const mongoUrl = process.env.INTEGRATION_MONGO_URL;
for (const [name, value] of Object.entries({ databaseUrl, mongoUrl })) {
  if (!value || !new URL(value).pathname.endsWith("_test")) {
    throw new Error(
      `${name} must explicitly name a disposable database ending in _test.`,
    );
  }
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  MONGO_URL: mongoUrl,
  PAYMENT_DATABASE_URL: databaseUrl,
  NODE_ENV: "production",
  KAFKA_TOPIC_REPLICATION_FACTOR: "1",
  KAFKA_TOPIC_MIN_INSYNC_REPLICAS: "1",
};

for (const command of [
  ["run", "--cwd", "packages/product-db", "db:generate"],
  ["run", "--cwd", "packages/product-db", "db:validate"],
  ["run", "--cwd", "packages/product-db", "db:deploy"],
  ["run", "--cwd", "packages/order-db", "db:deploy"],
  ["run", "--cwd", "apps/payment-service", "db:deploy"],
  ["test", "--timeout", "15000", "./integration-tests"],
]) {
  const child = Bun.spawn([process.execPath, ...command], {
    cwd: `${import.meta.dir}/..`,
    env,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await child.exited;
  if (code !== 0) process.exit(code);
}
