const engineGlob = new Bun.Glob("node_modules/@prisma/engines/schema-engine-*");
const enginePaths = Array.from(
  engineGlob.scanSync({
    cwd: process.cwd(),
  }),
);
const schemaEnginePath = enginePaths[0];

if (!schemaEnginePath) {
  console.error("Unable to find a packaged Prisma schema engine binary.");
  process.exit(1);
}

const child = Bun.spawn({
  cmd: ["bun", "../../node_modules/prisma/build/index.js", "migrate", "deploy"],
  cwd: "packages/product-db",
  env: {
    ...process.env,
    PRISMA_SCHEMA_ENGINE_BINARY: `${process.cwd()}/${schemaEnginePath}`,
  },
  stderr: "inherit",
  stdout: "inherit",
});

process.exit(await child.exited);
