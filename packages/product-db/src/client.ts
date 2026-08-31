import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

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

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  connectionTimeoutMillis: positiveIntegerEnv(
    "POSTGRES_CONNECTION_TIMEOUT_MS",
    5_000,
  ),
  idleTimeoutMillis: positiveIntegerEnv("POSTGRES_IDLE_TIMEOUT_MS", 30_000),
  max: positiveIntegerEnv("POSTGRES_POOL_MAX", 20),
});

const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

export const connectProductDB = async () => {
  await prisma.$connect();
};

export const disconnectProductDB = async () => {
  await prisma.$disconnect();
};

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
