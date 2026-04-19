import {
  bearerSecurity,
  createHttpException,
  createRoute,
  createServiceRouter,
  createSuccessResponseSchema,
  errorResponseSchema,
  jsonContent,
  validationErrorResponseSchema,
  z,
} from "@repo/hono-utils";
import {
  checkoutSessionPayloadSchema,
  checkoutSessionStatusQuerySchema,
} from "@repo/types";
import type { ServiceVariables } from "@/middleware/auth";
import { shouldBeUser } from "@/middleware/auth";
import { StripeCheckoutService } from "@/services/StripeCheckoutService";

const createCheckoutSessionResponseSchema = createSuccessResponseSchema(
  z.object({
    clientSecret: z.string(),
    sessionId: z.string(),
  }),
).openapi("CreateCheckoutSessionResponse");

const checkoutSessionStatusResponseSchema = createSuccessResponseSchema(
  z.object({
    sessionId: z.string(),
    status: z.string(),
    paymentStatus: z.string(),
    customerEmail: z.string().email().nullable(),
    paymentIntentId: z.string().nullable(),
  }),
).openapi("CheckoutSessionStatusResponse");

const createCheckoutSessionRoute = createRoute({
  method: "post",
  path: "/api/session/create-checkout-session",
  tags: ["checkout"],
  summary: "Create checkout session",
  description:
    "Creates a Stripe Checkout Session for the embedded Elements checkout flow and returns its client secret.",
  security: bearerSecurity,
  middleware: [shouldBeUser],
  request: {
    body: {
      required: true,
      content: jsonContent(checkoutSessionPayloadSchema),
    },
  },
  responses: {
    200: {
      description: "Checkout session created successfully.",
      content: jsonContent(createCheckoutSessionResponseSchema),
    },
    401: {
      description: "The caller is not authenticated.",
      content: jsonContent(errorResponseSchema),
    },
    422: {
      description: "The request body was invalid.",
      content: jsonContent(validationErrorResponseSchema),
    },
    503: {
      description: "Checkout is not configured for this environment.",
      content: jsonContent(errorResponseSchema),
    },
  },
});

const getCheckoutSessionStatusRoute = createRoute({
  method: "get",
  path: "/api/session/status",
  tags: ["checkout"],
  summary: "Get checkout session status",
  request: {
    query: checkoutSessionStatusQuerySchema,
  },
  responses: {
    200: {
      description: "Checkout session status retrieved successfully.",
      content: jsonContent(checkoutSessionStatusResponseSchema),
    },
    404: {
      description: "Checkout session was not found.",
      content: jsonContent(errorResponseSchema),
    },
    422: {
      description: "The query parameters were invalid.",
      content: jsonContent(validationErrorResponseSchema),
    },
    503: {
      description: "Stripe is not configured for this environment.",
      content: jsonContent(errorResponseSchema),
    },
  },
});

export const sessionRoutes = createServiceRouter<{
  Variables: ServiceVariables;
}>()
  .openapi(createCheckoutSessionRoute, async (c) => {
    const session = await StripeCheckoutService.createCheckoutSession({
      payload: c.req.valid("json"),
      userId: c.get("userId"),
    });

    if (!session) {
      throw createHttpException(
        503,
        "Stripe is not configured for this environment.",
      );
    }

    return c.json({ success: true as const, data: session }, 200);
  })
  .openapi(getCheckoutSessionStatusRoute, async (c) => {
    const statusResult = await StripeCheckoutService.getCheckoutSessionStatus(
      c.req.valid("query").sessionId,
    );

    if (statusResult.kind === "not_configured") {
      throw createHttpException(
        503,
        "Stripe is not configured for this environment.",
      );
    }

    if (statusResult.kind === "not_found") {
      throw createHttpException(404, statusResult.message);
    }

    return c.json({ success: true as const, data: statusResult.data }, 200);
  });
