import { describe, expect, it } from "bun:test";
import {
  productListQuerySchema,
  productPayloadSchema,
  productUpdateSchema,
} from "../packages/types/src/index";

describe("@repo/types schemas", () => {
  it("rejects product payloads when selected colors do not have images", () => {
    const result = productPayloadSchema.safeParse({
      name: "Flagship Tee",
      shortDescription: "Performance cotton tee",
      description: "A reliable shirt for catalog smoke tests.",
      price: 3999,
      categorySlug: "t-shirts",
      sizes: ["m"],
      colors: ["black", "white"],
      images: {
        black: "/products/flagship-tee-black.png",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("matching image");
  });

  it("rejects empty update payloads", () => {
    const result = productUpdateSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(
      "At least one field must be updated.",
    );
  });

  it("coerces and bounds product list pagination", () => {
    const validQuery = productListQuerySchema.safeParse({
      page: "2",
      limit: "24",
    });

    expect(validQuery.success).toBe(true);
    expect(validQuery.success ? validQuery.data : null).toMatchObject({
      page: 2,
      limit: 24,
    });

    expect(productListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ limit: "101" }).success).toBe(
      false,
    );
  });
});
