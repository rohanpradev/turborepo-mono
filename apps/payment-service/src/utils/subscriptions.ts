import { type TopicHandler, Topics } from "@repo/kafka";
import { recordIntegrationEvent } from "../observability/integrationEvents";
import { StripeCatalogService } from "../services/StripeCatalogService";
import { consumer } from "./kafka";

export const runKafkaSubscriptions = async () => {
  const handlers: Array<
    | TopicHandler<typeof Topics.PRODUCT_CREATED>
    | TopicHandler<typeof Topics.PRODUCT_DELETED>
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
  ];

  await consumer.start(handlers);
  recordIntegrationEvent({
    source: "kafka",
    type: "kafka.subscriptions.started",
    message: "Payment service subscribed to catalog Kafka topics.",
    details: {
      fromBeginning: false,
    },
  });
};
