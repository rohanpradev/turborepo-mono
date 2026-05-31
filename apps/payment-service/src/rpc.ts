import { implement } from "@orpc/server";
import { paymentContract } from "@repo/contracts";
import { createORPCException, getAuthenticatedUserId } from "@repo/hono-utils";
import { Topics } from "@repo/kafka";
import type { Context } from "hono";
import { listIntegrationEvents } from "@/observability/integrationEvents";
import { StripeCheckoutService } from "@/services/StripeCheckoutService";

type RPCContext = {
  hono: Context;
};

const os = implement(paymentContract).$context<RPCContext>();

export const paymentRouter = os.router({
  checkout: {
    createSession: os.checkout.createSession.handler(
      async ({ context, input }) => {
        const userId = getAuthenticatedUserId(context.hono);
        const session = await StripeCheckoutService.createCheckoutSession({
          payload: input,
          userId,
        });

        if (!session) {
          throw createORPCException(
            503,
            "Stripe is not configured for this environment.",
          );
        }

        return { success: true as const, data: session };
      },
    ),
    getSessionStatus: os.checkout.getSessionStatus.handler(
      async ({ input }) => {
        const statusResult =
          await StripeCheckoutService.getCheckoutSessionStatus(input.sessionId);

        if (statusResult.kind === "not_configured") {
          throw createORPCException(
            503,
            "Stripe is not configured for this environment.",
          );
        }

        if (statusResult.kind === "not_found") {
          throw createORPCException(404, statusResult.message);
        }

        return { success: true as const, data: statusResult.data };
      },
    ),
  },
  ops: {
    integrationEvents: os.ops.integrationEvents.handler(async () => ({
      success: true as const,
      data: {
        kafkaUiUrl: process.env.KAFKA_UI_URL ?? "https://kafka.localhost",
        topics: {
          consumes: [
            Topics.PRODUCT_CREATED,
            Topics.PRODUCT_UPDATED,
            Topics.PRODUCT_DELETED,
          ],
          publishes: [Topics.PAYMENT_SUCCESSFUL],
        },
        recentEvents: listIntegrationEvents(),
      },
    })),
  },
});
