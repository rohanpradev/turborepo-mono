import { describe, expect, it } from "bun:test";
import {
  productListQuerySchema,
  productPayloadSchema,
  productUpdateSchema,
} from "../packages/types/src/index";

describe("@repo/types schemas", () => {
  const validProductPayload = {
    name: "Flagship Tee",
    shortDescription: "Performance cotton tee",
    description: "A reliable shirt for catalog smoke tests.",
    price: 3999,
    categorySlug: "t-shirts",
    sizes: ["m"],
    colors: ["black"],
    images: {
      black: "/products/flagship-tee-black.png",
    },
  };

  it("rejects product payloads when selected colors do not have images", () => {
    const result = productPayloadSchema.safeParse({
      ...validProductPayload,
      colors: ["black", "white"],
      images: {
        black: "/products/flagship-tee-black.png",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("matching image");
  });

  it("accepts durable HTTP(S) product image URLs", () => {
    expect(
      productPayloadSchema.safeParse({
        ...validProductPayload,
        images: {
          black:
            "https://assets.example.com/products/flagship-tee.png?v=20260526",
        },
      }).success,
    ).toBe(true);

    expect(
      productPayloadSchema.safeParse({
        ...validProductPayload,
        images: {
          black: "http://localhost:9000/catalog/flagship-tee.png",
        },
      }).success,
    ).toBe(true);
  });

  it("rejects browser-only or unsafe product image URLs", () => {
    for (const image of [
      "blob:https://admin.localhost/temporary-object",
      "data:image/svg+xml,<svg />",
      "javascript:alert(1)",
      "//cdn.example.com/products/flagship-tee.png",
      "https://assets.example.com/products/flagship tee.png",
    ]) {
      expect(
        productPayloadSchema.safeParse({
          ...validProductPayload,
          images: {
            black: image,
          },
        }).success,
      ).toBe(false);
    }
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
