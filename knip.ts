import { defineConfig } from "knip/config";

export default defineConfig((options) => {
  const production = options.production || options.strict;
  return {
    ignore: [
      "packages/product-db/migrations/**",
      "packages/product-db/src/contract.prisma",
    ],
    ignoreBinaries: ["make"],
    // bun-types 1.4.2 imports undici-types without declaring it.
    ignoreDependencies: ["undici-types"],
    ignoreExportsUsedInFile: { interface: true, type: true },
    ignoreIssues: {
      "apps/admin/src/components/ui/**": ["exports"],
      "apps/client/src/components/ui/dialog.tsx": ["exports"],
    },
    tags: ["-lintignore"],
    workspaces: {
      ".": {
        // Make invokes this script; package.json scripts are discovered automatically.
        entry: [
          "tests/**/*.test.ts",
          "integration-tests/**/*.test.ts",
          "scripts/k8s-runtime-secret.ts",
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
      "apps/payment-service": production ? { entry: ["src/index.ts!"] } : {},
      "packages/hono-utils": {
        // Required peer of the Clerk Hono adapter, resolved in this workspace.
        ignoreDependencies: ["@clerk/backend"],
      },
      "packages/typescript-config": { ignoreUnresolved: ["next"] },
      "packages/order-db": production
        ? { entry: ["src/deploy-indexes.ts!"] }
        : {},
      "packages/product-db": production
        ? {
            // Prisma runs in deployment jobs; production mode skips db:* scripts.
            ignoreDependencies: ["prisma"],
          }
        : {},
    },
  };
});
