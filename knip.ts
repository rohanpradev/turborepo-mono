import { defineConfig } from "knip/config";

export default defineConfig((options) => {
  const production = options.production || options.strict;
  return {
    ignore: ["packages/product-db/migrations/**"],
    // Knip does not yet recognize `check` as a built-in Bun subcommand.
    ignoreBinaries: ["make", "check"],
    ignoreExportsUsedInFile: { interface: true, type: true },
    ignoreIssues: {
      "apps/admin/src/components/ui/**": ["exports"],
      "apps/client/src/components/ui/dialog.tsx": ["exports"],
    },
    tags: ["-lintignore"],
    workspaces: {
      ".": {
        // Make and `bun run --check` invoke these operational entry points.
        // Knip does not yet discover files after Bun's new --check flag.
        entry: [
          "tests/**/*.test.ts",
          "integration-tests/**/*.test.ts",
          "scripts/*.ts",
        ],
        project: [
          "scripts/**/*.ts",
          "tests/**/*.ts",
          "integration-tests/**/*.ts",
        ],
        ignoreUnresolved: ["./tests/preload.ts"],
      },
      "apps/product-service": {
        entry: ["src/index.ts!", "src/scripts/*.ts!"],
      },
      "apps/order-service": production ? { entry: ["src/index.ts!"] } : {},
      "apps/payment-service": { entry: ["src/index.ts!", "src/scripts/*.ts!"] },
      "packages/kafka": production ? { entry: ["src/replay.ts!"] } : {},
      "packages/typescript-config": { ignoreUnresolved: ["next"] },
      "packages/order-db": production
        ? { entry: ["src/deploy-indexes.ts!"] }
        : {},
      "packages/product-db": production
        ? {
            entry: ["src/deploy-inventory.ts!"],
            // Prisma runs in deployment jobs; production mode skips db:* scripts.
            ignoreDependencies: ["prisma"],
          }
        : {},
    },
  };
});
