import { describe, expect, test } from "bun:test";
import { toProductRecord } from "../apps/product-service/src/utils/product-record";
import type { Product } from "../packages/product-db/src";
import { productRecordSchema } from "../packages/types/src/api";

const product = {
  id: 42,
  name: "Legacy tee",
  shortDescription: "Legacy PostgreSQL arrays",
  description: "Preserve the catalog's public variant representation.",
  price: 1999,
  sizes: ["m", null, "l"],
  colors: [null, "black", "white", null],
  images: { black: "/black.png", white: "/white.png" },
  categorySlug: "tees",
  createdAt: Temporal.PlainDateTime.from("2026-10-28T12:34:56.123"),
  updatedAt: Temporal.PlainDateTime.from("2026-10-28T12:34:56.123"),
} satisfies Product;

describe("product record serialization", () => {
  test("omits legacy null array elements at the API boundary", () => {
    const record = toProductRecord(product);
    expect(record.sizes).toEqual(["m", "l"]);
    expect(record.colors).toEqual(["black", "white"]);
    expect(productRecordSchema.parse(record)).toEqual(record);
    expect(product.sizes).toEqual(["m", null, "l"]);
    expect(product.colors).toEqual([null, "black", "white", null]);
  });

  test("keeps all-null stored variants empty instead of inventing stock", () => {
    const record = toProductRecord({ ...product, sizes: [null], colors: [] });
    expect(record.sizes).toEqual([]);
    expect(record.colors).toEqual([]);
    expect(productRecordSchema.safeParse(record).success).toBe(true);
  });
});
