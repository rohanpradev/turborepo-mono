import { defineConfig } from "knip/config";

export default defineConfig((options) => {
  const production = options.production || options.strict;
  return {
    ignore: ["packages/product-db/migrations/**"],
    ignoreBinaries: ["make"],
    ignoreExportsUsedInFile: { interface: true, type: true },
    ignoreIssues: {
      "apps/admin/src/components/ui/**": ["exports"],
      "apps/client/src/components/ui/dialog.tsx": ["exports"],
    },
    tags: ["-lintignore"],
    workspaces: {
      ".": {
        // Make and Bun's --check commands need explicit operational entries.
        // Knip 6.44.1 still does not recognize Bun's new --check flag.
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
