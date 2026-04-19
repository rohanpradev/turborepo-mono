import {
  createHttpException,
  createRoute,
  createServiceRouter,
  errorResponseSchema,
  jsonContent,
  z,
} from "@repo/hono-utils";
import { StripeWebhookService } from "@/services/StripeWebhookService";

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
    503: {
      description:
        "Stripe webhook handling is not configured for this environment.",
      content: jsonContent(errorResponseSchema),
    },
  },
});

export const webhookRoutes = createServiceRouter().openapi(
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
