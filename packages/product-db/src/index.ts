import type { Scalars } from "@prisma/orm-postgres/family-contract/types";
import type { CreateInput } from "@prisma/orm-postgres/orm-client";
import type { Contract, FieldInputTypes, Models } from "./contract.d";

export type Category = Scalars<Models.public_Category>;
export type Product = Scalars<Models.public_Product>;
export type ProductOutboxEvent = Scalars<Models.public_ProductOutboxEvent>;
export type ProductOutboxEventCreateInput = CreateInput<
  Contract,
  "ProductOutboxEvent",
  "public"
>;
export type ProductJsonInput =
  FieldInputTypes["public"]["ProductOutboxEvent"]["payload"];
export { and, not, or } from "@prisma/orm-postgres/orm-client";
export { connectProductDB, db, disconnectProductDB } from "./client";
