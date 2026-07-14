import { type TopicHandler, Topics } from "@repo/kafka";
import { recordIntegrationEvent } from "@/observability/integrationEvents";
import { StripeCatalogService } from "@/services/StripeCatalogService";
import { StripePaymentEventService } from "@/services/StripePaymentEventService";
import { consumer } from "@/utils/kafka";

export const runKafkaSubscriptions = async () => {
  const handlers: Array<
    | TopicHandler<typeof Topics.PRODUCT_CREATED>
    | TopicHandler<typeof Topics.PRODUCT_UPDATED>
    | TopicHandler<typeof Topics.PRODUCT_DELETED>
    | TopicHandler<typeof Topics.STRIPE_CHECKOUT_COMPLETED>
  > = [
    {
      topicName: Topics.PRODUCT_CREATED,
      topicHandler: async (message) => {
        recordIntegrationEvent({
          source: "kafka",
          type: "product.created.received",
          message: "Received product.created Kafka event.",
          details: {
            productId: message.id,
            price: message.price,
          },
        });
        await StripeCatalogService.syncCreatedProduct(message);
      },
    },
    {
      topicName: Topics.PRODUCT_UPDATED,
      topicHandler: async (message) => {
        recordIntegrationEvent({
          source: "kafka",
          type: "product.updated.received",
          message: "Received product.updated Kafka event.",
          details: {
            productId: message.id,
            price: message.price,
          },
        });
        await StripeCatalogService.syncCreatedProduct(message);
      },
    },
    {
      topicName: Topics.PRODUCT_DELETED,
      topicHandler: async (message) => {
        recordIntegrationEvent({
          source: "kafka",
          type: "product.deleted.received",
          message: "Received product.deleted Kafka event.",
          details: {
            productId: message.id,
          },
        });
        await StripeCatalogService.archiveDeletedProduct(message.id);
      },
    },
    {
      topicName: Topics.STRIPE_CHECKOUT_COMPLETED,
      topicHandler: async (message) => {
        recordIntegrationEvent({
          source: "kafka",
          type: "stripe.checkout.completed.received",
          message: "Received paid Checkout Session enrichment event.",
          details: {
            eventId: message.eventId,
            sessionId: message.sessionId,
          },
        });
        await StripePaymentEventService.processCompletedCheckout(message);
      },
    },
  ];

  await consumer.start(handlers);
  recordIntegrationEvent({
    source: "kafka",
    type: "kafka.subscriptions.started",
    message: "Payment service subscribed to catalog and Stripe Kafka topics.",
    details: {
      fromBeginning: false,
    },
  });
};
