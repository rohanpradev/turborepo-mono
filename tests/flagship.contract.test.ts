import { describe, expect, it } from "bun:test";
import { app as orderApp } from "../apps/order-service/src/app.ts";
import { app as paymentApp } from "../apps/payment-service/src/app.ts";
import { app as productApp } from "../apps/product-service/src/app.ts";
import { setStripeClientForTesting } from "../apps/payment-service/src/utils/stripe.ts";
import {
  ApiClientError,
  listOrders,
} from "../packages/api-client/src/index.ts";
import { getCorsOrigins } from "../packages/hono-utils/src/index.ts";

type ServiceExpectation = {
  name: string;
  app: {
    request: typeof productApp.request;
    fetch: typeof productApp.fetch;
  };
  rootMessage: string;
  rootVersion: string;
  healthService: string;
  openApiTitle: string;
  documentedPath: string;
  requiredDependencies: Array<string>;
};

type EnvPatch = Record<string, string | undefined>;

const serviceExpectations: ServiceExpectation[] = [
  {
    name: "product-service",
    app: productApp,
    rootMessage: "Product Service API",
    rootVersion: "1.2.0",
    healthService: "product-service",
    openApiTitle: "Product Service API",
    documentedPath: "/products",
    requiredDependencies: ["database", "kafka.producer"],
  },
  {
    name: "order-service",
    app: orderApp,
    rootMessage: "Order Service API",
    rootVersion: "1.0.0",
    healthService: "order-service",
    openApiTitle: "Order Service API",
    documentedPath: "/api/orders",
    requiredDependencies: ["database", "kafka.producer", "kafka.consumer"],
  },
  {
    name: "payment-service",
    app: paymentApp,
    rootMessage: "Payment Service API",
    rootVersion: "1.0.0",
    healthService: "payment-service",
    openApiTitle: "Payment Service API",
    documentedPath: "/api/session/create-checkout-session",
    requiredDependencies: ["kafka.producer", "kafka.consumer"],
  },
];

const setEnvPatch = (patch: EnvPatch) => {
  const previous = Object.fromEntries(
    Object.keys(patch).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
        continue;
      }

      process.env[key] = value;
    }
  };
};

const withEnvPatch = async <T>(
  patch: EnvPatch,
  callback: () => Promise<T>,
): Promise<T> => {
  const restore = setEnvPatch(patch);

  try {
    return await callback();
  } finally {
    restore();
  }
};

const validProductPayload = {
  name: "Sneaker",
  shortDescription: "release",
  description: "A fully typed product payload used for contract tests.",
  price: 199,
  categorySlug: "sneakers",
  sizes: ["42"],
  colors: ["black"],
  images: {
    black: "https://cdn.example.com/products/sneaker-black.png",
  },
};

const validCheckoutPayload = {
  cart: [
    {
      id: 1,
      name: "Flagship Sneaker",
      shortDescription: "Flagship release",
      description:
        "A fully typed flagship product payload used for contract tests.",
      price: 199,
      sizes: ["42"],
      colors: ["black"],
      images: {
        black: "https://cdn.example.com/products/flagship-black.png",
      },
      categorySlug: "sneakers",
      quantity: 1,
      selectedSize: "42",
      selectedColor: "black",
    },
  ],
  totalAmount: 199,
  shippingInfo: {
    email: "customer@example.com",
    name: "Flagship Customer",
    address: {
      line1: "221B Baker Street",
      city: "London",
      country: "GB",
    },
  },
};

describe("flagship service contracts", () => {
  for (const service of serviceExpectations) {
    it(`${service.name} publishes root metadata, health, docs, and OpenAPI`, async () => {
      await withEnvPatch(
        {
          CORS_ALLOWED_ORIGINS: undefined,
        },
        async () => {
          const rootResponse = await service.app.request("/");
          expect(rootResponse.status).toBe(200);
          expect(rootResponse.headers.get("x-request-id")).toBeString();
          expect(await rootResponse.json()).toEqual({
            message: service.rootMessage,
            version: service.rootVersion,
          });

          const healthResponse = await service.app.request("/health");
          expect(healthResponse.status).toBe(200);
          const healthPayload = (await healthResponse.json()) as {
            status: string;
            service: string;
            timestamp: string;
          };
          expect(healthPayload.status).toBe("ok");
          expect(healthPayload.service).toBe(service.healthService);
          expect(Date.parse(healthPayload.timestamp)).not.toBeNaN();

          const docsResponse = await service.app.request("/docs");
          expect(docsResponse.status).toBe(200);
          expect(docsResponse.headers.get("content-type")).toContain(
            "text/html",
          );
          expect(await docsResponse.text()).toContain(
            `${service.openApiTitle} API Reference`,
          );

          const openApiResponse = await service.app.request("/openapi.json");
          expect(openApiResponse.status).toBe(200);
          const spec = (await openApiResponse.json()) as {
            info: { title: string; version: string };
            components?: {
              securitySchemes?: Record<
                string,
                { type?: string; scheme?: string; bearerFormat?: string }
              >;
            };
            paths: Record<string, unknown>;
          };

          expect(spec.info.title).toBe(service.openApiTitle);
          expect(spec.info.version).toBe(service.rootVersion);
          expect(spec.paths[service.documentedPath]).toBeDefined();
          expect(spec.paths["/health/ready"]).toBeDefined();
          expect(spec.components?.securitySchemes?.bearerAuth).toMatchObject({
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          });
        },
      );
    });

    it(`${service.name} allows both storefront and admin origins by default`, async () => {
      await withEnvPatch(
        {
          CORS_ALLOWED_ORIGINS: undefined,
        },
        async () => {
          const storefrontResponse = await service.app.request("/health", {
            headers: {
              Origin: "https://shop.localhost",
            },
          });
          expect(
            storefrontResponse.headers.get("access-control-allow-origin"),
          ).toBe("https://shop.localhost");

          const adminResponse = await service.app.request("/health", {
            headers: {
              Origin: "https://admin.localhost",
            },
          });
          expect(adminResponse.headers.get("access-control-allow-origin")).toBe(
            "https://admin.localhost",
          );
        },
      );
    });

    it(`${service.name} reports degraded readiness before runtime bootstrap`, async () => {
      const response = await service.app.request("/health/ready");
      expect(response.status).toBe(503);

      const payload = (await response.json()) as {
        status: string;
        ready: boolean;
        dependencies: Array<{
          name: string;
          status: string;
          required: boolean;
        }>;
      };

      expect(payload.status).toBe("degraded");
      expect(payload.ready).toBe(false);
      expect(
        payload.dependencies
          .filter((dependency) => dependency.required)
          .map((dependency) => dependency.name),
      ).toEqual(service.requiredDependencies);
      expect(
        payload.dependencies.every(
          (dependency) => dependency.status === "not_ready",
        ),
      ).toBeTrue();
    });
  }

  it("returns the shared validation payload shape for invalid product list queries", async () => {
    const response = await productApp.request("/products?limit=0");
    expect(response.status).toBe(422);

    const payload = (await response.json()) as {
      success: boolean;
      error: string;
      timestamp?: string;
      requestId?: string;
      issues: Array<{ path: Array<string | number>; message: string }>;
    };

    expect(payload.success).toBe(false);
    expect(payload.error).toBe("Validation failed");
    expect(payload.timestamp).toBeString();
    expect(payload.requestId).toBeString();
    expect(
      payload.issues.some((issue) => issue.path.includes("limit")),
    ).toBeTrue();
  });

  it("rejects unknown product query parameters to keep the API contract strict", async () => {
    const response = await productApp.request("/products?unexpected=value");
    expect(response.status).toBe(422);

    const payload = (await response.json()) as {
      success: boolean;
      error: string;
      issues: Array<{ path: Array<string | number>; message: string }>;
    };

    expect(payload.success).toBe(false);
    expect(payload.error).toBe("Validation failed");
    expect(
      payload.issues.some((issue) =>
        issue.message.toLowerCase().includes("unrecognized"),
      ),
    ).toBeTrue();
  });

  it("returns 503 for product mutations when Clerk is not configured", async () => {
    await withEnvPatch(
      {
        CLERK_PUBLISHABLE_KEY: undefined,
        CLERK_SECRET_KEY: undefined,
      },
      async () => {
        const response = await productApp.request("/products", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(validProductPayload),
        });

        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({
          success: false,
          error: "Clerk auth is not configured for this environment.",
        });
      },
    );
  });

  it("returns 503 for order queries when Clerk is not configured", async () => {
    await withEnvPatch(
      {
        CLERK_PUBLISHABLE_KEY: undefined,
        CLERK_SECRET_KEY: undefined,
      },
      async () => {
        const response = await orderApp.request("/api/orders");

        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({
          success: false,
          error: "Clerk auth is not configured for this environment.",
        });
      },
    );
  });

  it("returns 503 for checkout creation when auth is not configured", async () => {
    await withEnvPatch(
      {
        CLERK_PUBLISHABLE_KEY: undefined,
        CLERK_SECRET_KEY: undefined,
        STRIPE_SECRET_KEY: undefined,
      },
      async () => {
        const response = await paymentApp.request(
          "/api/session/create-checkout-session",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(validCheckoutPayload),
          },
        );

        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({
          success: false,
          error: "Clerk auth is not configured for this environment.",
        });
      },
    );
  });

  it("returns 503 for Stripe webhooks when Stripe is not configured", async () => {
    await withEnvPatch(
      {
        STRIPE_SECRET_KEY: undefined,
        STRIPE_WEBHOOK_SECRET: undefined,
      },
      async () => {
        const response = await paymentApp.request("/api/webhooks/stripe", {
          method: "POST",
          headers: {
            "stripe-signature": "test-signature",
          },
          body: "{}",
        });

        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({
          success: false,
          error:
            "Stripe webhook handling is not configured for this environment.",
        });
      },
    );
  });

  it("returns 404 for unknown checkout sessions instead of leaking a Stripe failure", async () => {
    await withEnvPatch(
      {
        STRIPE_SECRET_KEY: "test-key",
      },
      async () => {
        const fakeStripeClient = {
          checkout: {
            sessions: {
              retrieve: async () => {
                const error = new Error(
                  "No such checkout.session: test-session",
                ) as Error & {
                  statusCode?: number;
                  code?: string;
                };
                error.statusCode = 404;
                error.code = "resource_missing";
                throw error;
              },
            },
          },
        };

        setStripeClientForTesting(fakeStripeClient as never);

        try {
          const response = await paymentApp.request(
            "/api/session/status?sessionId=test-session",
          );

          expect(response.status).toBe(404);
          expect(await response.json()).toMatchObject({
            success: false,
            error: "Checkout session not found.",
          });
        } finally {
          setStripeClientForTesting(undefined);
        }
      },
    );
  });

  it("honors explicit CORS origin overrides", async () => {
    await withEnvPatch(
      {
        CORS_ALLOWED_ORIGINS:
          "https://flagship.example, https://admin.flagship.example",
      },
      async () => {
        expect(getCorsOrigins()).toEqual([
          "https://flagship.example",
          "https://admin.flagship.example",
        ]);

        const response = await productApp.request("/health", {
          headers: {
            Origin: "https://flagship.example",
          },
        });

        expect(response.headers.get("access-control-allow-origin")).toBe(
          "https://flagship.example",
        );
      },
    );
  });

  it("surfaces typed ApiClientError details from Hono services", async () => {
    await withEnvPatch(
      {
        CLERK_PUBLISHABLE_KEY: undefined,
        CLERK_SECRET_KEY: undefined,
      },
      async () => {
        const server = Bun.serve({
          port: 0,
          fetch: orderApp.fetch,
        });

        try {
          await listOrders(`http://127.0.0.1:${server.port}`, {
            token: "test",
          });
          throw new Error("Expected listOrders to throw ApiClientError");
        } catch (error) {
          expect(error).toBeInstanceOf(ApiClientError);

          if (error instanceof ApiClientError) {
            expect(error.status).toBe(503);
            expect(error.payload).toMatchObject({
              success: false,
              error: "Clerk auth is not configured for this environment.",
            });
          }
        } finally {
          server.stop(true);
        }
      },
    );
  });
});
