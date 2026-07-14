import {
  createErrorResponse,
  createHttpException,
  createRoute,
  createServiceRouter,
  errorResponseSchema,
  jsonContent,
  z,
} from "@repo/hono-utils";
import { bodyLimit } from "hono/body-limit";
import { StripeWebhookService } from "@/services/StripeWebhookService";

export const STRIPE_WEBHOOK_MAX_BODY_SIZE_BYTES = 1024 * 1024;

const webhookResponseSchema = z
  .object({
    received: z.boolean(),
  })
  .openapi("StripeWebhookResponse");

const stripeWebhookRoute = createRoute({
  method: "post",
  path: "/api/webhooks/stripe",
  tags: ["webhooks"],
  summary: "Handle Stripe webhook events",
  responses: {
    200: {
      description: "Webhook processed successfully.",
      content: jsonContent(webhookResponseSchema),
    },
    400: {
      description: "The webhook payload or signature was invalid.",
      content: jsonContent(errorResponseSchema),
    },
    413: {
      description: "The webhook payload exceeded the accepted size limit.",
      content: jsonContent(errorResponseSchema),
    },
    503: {
      description:
        "Stripe webhook handling is not configured for this environment.",
      content: jsonContent(errorResponseSchema),
    },
  },
});

const webhookRouter = createServiceRouter();

webhookRouter.use(
  "/api/webhooks/stripe",
  bodyLimit({
    maxSize: STRIPE_WEBHOOK_MAX_BODY_SIZE_BYTES,
    onError: (c) =>
      createErrorResponse(c, 413, "Stripe webhook payload is too large."),
  }),
);

export const webhookRoutes = webhookRouter.openapi(
  stripeWebhookRoute,
  async (c) => {
    const signature = c.req.header("stripe-signature");
    const payload = Buffer.from(await c.req.raw.arrayBuffer());

    const result = await StripeWebhookService.handleEvent(payload, signature);

    if (result.status === "not_configured") {
      throw createHttpException(
        503,
        "Stripe webhook handling is not configured for this environment.",
      );
    }

    if (result.status === "invalid") {
      throw createHttpException(400, result.message);
    }

    return c.json({ received: true }, 200);
  },
);
