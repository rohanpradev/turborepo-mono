import { describe, expect, it } from "bun:test";
import { resolveCheckoutCatalog } from "../apps/payment-service/src/services/StripeCheckoutService";
import type { ProductRecord } from "../packages/types/src";

describe("payment-service checkout catalog", () => {
  it.each(["selectedSize", "selectedColor"] as const)(
    "rejects oversized %s values before resolving or reserving a cart",
    async (field) => {
      let fetchCount = 0;
      await expect(
        resolveCheckoutCatalog(
          {
            checkoutAttemptId: "019f50b2-4dd4-7000-8000-000000000001",
            cart: [
              {
                id: 7,
                quantity: 1,
                selectedSize: "8",
                selectedColor: "black",
                [field]: "x".repeat(501),
              },
            ],
          },
          undefined,
          async () => {
            fetchCount += 1;
            return null;
          },
        ),
      ).rejects.toMatchObject({
        status: 409,
        message: "Cart contains a variant that exceeds the supported length.",
      });
      expect(fetchCount).toBe(0);
    },
  );

  it("fetches duplicate catalog products only once", async () => {
    const product: ProductRecord = {
      id: 7,
      name: "Everyday Shoe",
      shortDescription: "A daily shoe",
      description: "A reliable shoe for daily use.",
      price: 7_500,
      sizes: ["8", "9"],
      colors: ["black", "white"],
      images: {
        black: "/products/shoe-black.png",
        white: "/products/shoe-white.png",
      },
      categorySlug: "shoes",
    };
    let fetchCount = 0;

    const items = await resolveCheckoutCatalog(
      {
        checkoutAttemptId: "019f50b2-4dd4-7000-8000-000000000001",
        cart: [
          {
            id: 7,
            quantity: 1,
            selectedColor: "black",
            selectedSize: "8",
          },
          {
            id: 7,
            quantity: 2,
            selectedColor: "white",
            selectedSize: "9",
          },
        ],
      },
      undefined,
      async () => {
        fetchCount += 1;
        return product;
      },
    );

    expect(fetchCount).toBe(1);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.product.id)).toEqual([7, 7]);
  });
});
