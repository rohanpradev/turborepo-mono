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
  NODE_ENV: "production",
};

for (const command of [
  ["run", "--cwd", "packages/product-db", "db:deploy"],
  ["run", "--cwd", "packages/order-db", "db:deploy"],
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
