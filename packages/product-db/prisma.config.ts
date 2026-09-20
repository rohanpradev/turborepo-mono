import { defineConfig as definePostgresConfig } from "@prisma/orm-postgres/config";
import { definePrismaConfig } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/product_db?schema=public";

export default definePrismaConfig({
  orm: definePostgresConfig({
    contract: "src/contract.prisma",
    db: {
      connection: databaseUrl,
    },
    migrations: {
      dir: "migrations",
    },
  }),
});
