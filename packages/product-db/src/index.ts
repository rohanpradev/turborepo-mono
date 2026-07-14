export type {
  Category,
  Product,
  ProductOutboxEvent,
} from "../generated/prisma/client";
export { Prisma } from "../generated/prisma/client";
export { connectProductDB, disconnectProductDB, prisma } from "./client";
