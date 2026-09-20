import postgres from "@prisma/orm-postgres/runtime";
import { Pool } from "pg";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

const defaultDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/product_db?schema=public";

const positiveIntegerEnv = (name: string, fallback: number) => {
  const value = process.env[name];

  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
};

const createProductDatabase = () => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production.");
  }
  const pool = new Pool({
    connectionString: databaseUrl || defaultDatabaseUrl,
    connectionTimeoutMillis: positiveIntegerEnv(
      "POSTGRES_CONNECTION_TIMEOUT_MS",
      5_000,
    ),
    idleTimeoutMillis: positiveIntegerEnv("POSTGRES_IDLE_TIMEOUT_MS", 30_000),
    max: positiveIntegerEnv("POSTGRES_POOL_MAX", 20),
  });
  // Idle clients can fail after a database restart. An unhandled pool error
  // terminates the process even when no query is in flight.
  pool.on("error", (error) => {
    console.error("Product database idle connection failed:", error.message);
  });
  const db = postgres<Contract>({ contractJson, pg: pool });

  return { db, pool };
};

type ProductDatabase = ReturnType<typeof createProductDatabase>;

const globalForProductDatabase = globalThis as {
  productDatabase?: ProductDatabase;
};
const productDatabase =
  globalForProductDatabase.productDatabase ?? createProductDatabase();

export const db = productDatabase.db;

export const connectProductDB = async () => {
  await db.connect();
  // Acquiring a runtime is lazy. Read the migrated schema before announcing
  // readiness so a missing database or migration cannot appear healthy.
  await db.orm.public.Category.first();
};

export const disconnectProductDB = async () => {
  try {
    await db.close();
  } finally {
    await productDatabase.pool.end();
  }
};

if (process.env.NODE_ENV !== "production") {
  globalForProductDatabase.productDatabase = productDatabase;
}
