import { implement } from "@orpc/server";
import { paymentContract } from "@repo/contracts";
import {
  createORPCException,
  getAuthenticatedAdminUserId,
  getAuthenticatedUserId,
  getTelemetryHeaders,
} from "@repo/hono-utils";
import { Topics } from "@repo/kafka";
import type { Context } from "hono";
import { listIntegrationEvents } from "@/observability/integrationEvents";
import { StripeCheckoutService } from "@/services/StripeCheckoutService";
import { getPaymentStore } from "./storage/payment-store";

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
          telemetryHeaders: getTelemetryHeaders(context.hono),
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
      async ({ context, input }) => {
        const userId = getAuthenticatedUserId(context.hono);
        const statusResult =
          await StripeCheckoutService.getCheckoutSessionStatus(
            input.sessionId,
            userId,
          );

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
    activities: os.ops.activities.handler(async ({ context }) => {
      getAuthenticatedAdminUserId(context.hono);
      const rows = await getPaymentStore().activities();
      return {
        success: true as const,
        data: rows.map(({ snapshot, session_id, payment }) => ({
          amountCents: snapshot.total,
          checkoutTimestamp: new Date(snapshot.createdAt).toISOString(),
          completedTimestamp: payment?.processedAt ?? null,
          itemCount: snapshot.items.reduce(
            (sum, item) => sum + item.quantity,
            0,
          ),
          paymentIntentId: payment?.transactionId ?? null,
          sessionId: session_id,
          status: payment ? ("paid" as const) : ("pending" as const),
          userId: snapshot.userId,
        })),
      };
    }),
    integrationEvents: os.ops.integrationEvents.handler(async ({ context }) => {
      getAuthenticatedAdminUserId(context.hono);

      return {
        success: true as const,
        data: {
          kafkaUiUrl: process.env.KAFKA_UI_URL ?? "https://kafka.localhost",
          topics: {
            consumes: [
              Topics.PRODUCT_CREATED,
              Topics.PRODUCT_UPDATED,
              Topics.PRODUCT_DELETED,
              Topics.STRIPE_CHECKOUT_COMPLETED,
            ],
            publishes: [Topics.PAYMENT_SUCCESSFUL],
          },
          recentEvents: listIntegrationEvents(),
        },
      };
    }),
  },
});
