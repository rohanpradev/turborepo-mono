import type { CreateInput } from "@prisma/orm-postgres/orm-client";
import type { Contract, FieldInputTypes, FieldOutputTypes } from "./contract.d";

export type Category = FieldOutputTypes["public"]["Category"];
export type Product = FieldOutputTypes["public"]["Product"];
export type ProductOutboxEvent =
  FieldOutputTypes["public"]["ProductOutboxEvent"];
export type ProductOutboxEventCreateInput = CreateInput<
  Contract,
  "ProductOutboxEvent",
  "public"
>;
export type ProductJsonInput =
  FieldInputTypes["public"]["ProductOutboxEvent"]["payload"];
export { and, not, or } from "@prisma/orm-postgres/orm-client";
export { connectProductDB, db, disconnectProductDB } from "./client";
