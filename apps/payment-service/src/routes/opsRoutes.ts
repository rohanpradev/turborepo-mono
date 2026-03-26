import {
  createRoute,
  createServiceRouter,
  createSuccessResponseSchema,
  jsonContent,
  z,
} from "@repo/hono-utils";
import { Topics } from "@repo/kafka";
import { listIntegrationEvents } from "../observability/integrationEvents";

const integrationEventSchema = z.object({
  id: z.string(),
  source: z.enum(["service", "kafka", "stripe", "checkout", "webhook"]),
  type: z.string(),
  message: z.string(),
  timestamp: z.string(),
  details: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    )
    .optional(),
});

const paymentOpsEventsResponseSchema = createSuccessResponseSchema(
  z.object({
    kafkaUiUrl: z.string().url(),
    topics: z.object({
      consumes: z.array(z.string()),
      publishes: z.array(z.string()),
    }),
    recentEvents: z.array(integrationEventSchema),
  }),
).openapi("PaymentOpsEventsResponse");

const getOpsEventsRoute = createRoute({
  method: "get",
  path: "/ops/events",
  tags: ["ops"],
  summary: "List recent payment integration events",
  description:
    "Returns recent Kafka, Stripe, checkout, and webhook events observed by the payment service.",
  responses: {
    200: {
      description: "Recent integration events retrieved successfully.",
      content: jsonContent(paymentOpsEventsResponseSchema),
    },
  },
});

export const opsRoutes = createServiceRouter().openapi(getOpsEventsRoute, (c) =>
  c.json(
    {
      success: true as const,
      data: {
        kafkaUiUrl: process.env.KAFKA_UI_URL ?? "https://kafka.localhost",
        topics: {
          consumes: [Topics.PRODUCT_CREATED, Topics.PRODUCT_DELETED],
          publishes: [Topics.PAYMENT_SUCCESSFUL],
        },
        recentEvents: listIntegrationEvents(),
      },
    },
    200,
  ),
);
