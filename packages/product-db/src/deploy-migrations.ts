import { existsSync } from "node:fs";
import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dir, "..");
const repositoryRoot = resolve(packageRoot, "../..");
const enginePatterns = [
  "node_modules/@prisma/engines/schema-engine-*",
  "node_modules/.bun/@prisma+engines@*/node_modules/@prisma/engines/schema-engine-*",
];
const enginePaths = enginePatterns.flatMap((pattern) =>
  Array.from(
    new Bun.Glob(pattern).scanSync({ cwd: repositoryRoot, dot: true }),
  ),
);
const schemaEnginePath = enginePaths[0];

if (!schemaEnginePath) {
  console.error("Unable to find a packaged Prisma schema engine binary.");
  process.exit(1);
}

const prismaCliCandidates = [
  resolve(repositoryRoot, "node_modules/prisma/build/index.js"),
  resolve(packageRoot, "node_modules/prisma/build/index.js"),
];
const prismaCliPath = prismaCliCandidates.find(existsSync);

if (!prismaCliPath) {
  console.error("Unable to find the packaged Prisma CLI.");
  process.exit(1);
}

const child = Bun.spawn({
  cmd: ["bun", prismaCliPath, "migrate", "deploy"],
  cwd: packageRoot,
  env: {
    ...process.env,
    PRISMA_SCHEMA_ENGINE_BINARY: resolve(repositoryRoot, schemaEnginePath),
  },
  stderr: "inherit",
  stdout: "inherit",
});

process.exit(await child.exited);
