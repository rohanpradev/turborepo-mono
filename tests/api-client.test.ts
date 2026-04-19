import { afterEach, describe, expect, it } from "bun:test";
import {
  ApiClientError,
  createCheckoutSession,
  getCheckoutSessionStatus,
  listProducts,
} from "../packages/api-client/src/index";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("@repo/api-client", () => {
  it("builds product list requests with query parameters", async () => {
    let capturedUrl: URL | null = null;

    globalThis.fetch = (async (input) => {
      capturedUrl = new URL(
        input instanceof Request ? input.url : String(input),
      );

      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          meta: {
            pageSize: 8,
            total: 0,
            totalPages: 1,
          },
        }),
        {
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }) as typeof fetch;

    await listProducts("https://api.localhost", {
      category: "t-shirts",
      limit: 8,
      sort: "newest",
    });

    expect(capturedUrl?.pathname).toBe("/products");
    expect(capturedUrl?.searchParams.get("category")).toBe("t-shirts");
    expect(capturedUrl?.searchParams.get("limit")).toBe("8");
    expect(capturedUrl?.searchParams.get("sort")).toBe("newest");
  });

  it("sends checkout session requests with auth and JSON body", async () => {
    let capturedRequest: Request | null = null;

    globalThis.fetch = (async (input, init) => {
      capturedRequest = new Request(input, init);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            clientSecret: "cs_test_123",
            sessionId: "csess_123",
          },
        }),
        {
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }) as typeof fetch;

    await createCheckoutSession(
      "https://payments.localhost",
      {
        cart: [
          {
            id: 1,
            name: "Product",
            shortDescription: "Short description",
            description: "Long description",
            price: 4999,
            sizes: ["m"],
            colors: ["black"],
            images: { black: "/product.png" },
            categorySlug: "outerwear",
            quantity: 1,
            selectedSize: "m",
            selectedColor: "black",
          },
        ],
        totalAmount: 4999,
        shippingInfo: {
          email: "buyer@example.com",
          name: "Buyer",
          address: {
            line1: "123 Market Street",
            city: "New York",
            country: "US",
          },
        },
      },
      "test-token",
    );

    expect(capturedRequest?.method).toBe("POST");
    expect(capturedRequest?.headers.get("authorization")).toBe(
      "Bearer test-token",
    );
    expect(capturedRequest?.headers.get("content-type")).toBe(
      "application/json",
    );
    expect(capturedRequest && (await capturedRequest.json())).toMatchObject({
      totalAmount: 4999,
      shippingInfo: {
        email: "buyer@example.com",
      },
    });
  });

  it("surfaces typed API errors from JSON responses", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "Stripe unavailable" }), {
        status: 503,
        headers: {
          "content-type": "application/json",
        },
      })) as typeof fetch;

    const failure = getCheckoutSessionStatus(
      "https://payments.localhost",
      "cs_test_123",
    );

    await expect(failure).rejects.toBeInstanceOf(ApiClientError);
    await expect(failure).rejects.toMatchObject({
      message: "Stripe unavailable",
      status: 503,
    });
  });
});
