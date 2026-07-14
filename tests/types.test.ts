import { describe, expect, it } from "bun:test";
import {
  checkoutSessionPayloadSchema,
  MAX_CART_ITEM_QUANTITY,
  MAX_CHECKOUT_LINE_ITEMS,
  orderRecordSchema,
  productListQuerySchema,
  productPayloadSchema,
  productUpdateSchema,
  shippingFormSchema,
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

  it("accepts only bounded, server-authoritative checkout items", () => {
    const validItem = {
      id: 1,
      quantity: 1,
      selectedColor: "black",
      selectedSize: "m",
    };
    const validPayload = {
      checkoutAttemptId: "019f50b2-4dd4-7000-8000-000000000001",
      cart: [validItem],
    };

    expect(checkoutSessionPayloadSchema.safeParse(validPayload).success).toBe(
      true,
    );
    expect(
      checkoutSessionPayloadSchema.safeParse({
        ...validPayload,
        totalAmount: 1,
      }).success,
    ).toBe(false);
    expect(
      checkoutSessionPayloadSchema.safeParse({
        ...validPayload,
        cart: [
          {
            ...validItem,
            quantity: MAX_CART_ITEM_QUANTITY + 1,
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      checkoutSessionPayloadSchema.safeParse({
        ...validPayload,
        cart: Array.from(
          { length: MAX_CHECKOUT_LINE_ITEMS + 1 },
          (_, index) => ({ ...validItem, id: index + 1 }),
        ),
      }).success,
    ).toBe(false);
  });

  it("requires catalog prices to use integer currency minor units", () => {
    expect(
      productPayloadSchema.safeParse({
        ...validProductPayload,
        price: 39.99,
      }).success,
    ).toBe(false);
  });

  it("accepts accessible phone formatting while rejecting invalid input", () => {
    const validShippingDetails = {
      name: "Jordan Lee",
      email: "jordan@example.com",
      phone: "+1 (555) 123-4567",
      address: "123 Main Street",
      city: "New York",
    };

    expect(shippingFormSchema.safeParse(validShippingDetails).success).toBe(
      true,
    );
    expect(
      shippingFormSchema.safeParse({
        ...validShippingDetails,
        phone: "call-me-maybe",
      }).success,
    ).toBe(false);
  });

  it("accepts Stripe-backed order ids while preserving older order records", () => {
    const baseOrder = {
      _id: "mongo_order_id",
      userId: "user_123",
      email: "buyer@example.com",
      amount: 4999,
      status: "success",
      products: [{ name: "Flagship Tee", price: 4999, quantity: 1 }],
    };

    expect(
      orderRecordSchema.safeParse({
        ...baseOrder,
        orderId: "cs_test_123",
      }).success,
    ).toBe(true);
    expect(orderRecordSchema.safeParse(baseOrder).success).toBe(true);
  });
});
