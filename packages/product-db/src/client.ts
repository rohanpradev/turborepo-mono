import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const defaultDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/product_db?schema=public";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? defaultDatabaseUrl,
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
