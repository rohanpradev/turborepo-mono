import { createHash } from "node:crypto";
import { type TopicHandler, Topics } from "@repo/kafka";
import { getPaymentStore } from "../storage/payment-store";
import { consumer } from "./kafka";

export const runKafkaSubscriptions = async () => {
  const catalog = async (
    message: { id: string },
    context?: {
      traceparent?: string;
      topic: string;
      partition: number;
      offset: string;
    },
  ) => {
    const identity = context
      ? `${context.topic}:${context.partition}:${context.offset}`
      : createHash("sha256").update(JSON.stringify(message)).digest("hex");
    await getPaymentStore().enqueueCatalog(
      `catalog:${identity}`,
      message.id,
      context?.traceparent,
    );
  };
  const handlers: Array<
    | TopicHandler<typeof Topics.PRODUCT_CREATED>
    | TopicHandler<typeof Topics.PRODUCT_UPDATED>
    | TopicHandler<typeof Topics.PRODUCT_DELETED>
    | TopicHandler<typeof Topics.STRIPE_CHECKOUT_COMPLETED>
  > = [
    { topicName: Topics.PRODUCT_CREATED, topicHandler: catalog },
    { topicName: Topics.PRODUCT_UPDATED, topicHandler: catalog },
    { topicName: Topics.PRODUCT_DELETED, topicHandler: catalog },
    {
      topicName: Topics.STRIPE_CHECKOUT_COMPLETED,
      topicHandler: async (message, context) => {
        await getPaymentStore().enqueue(message, context?.traceparent);
      },
    },
  ];
  await consumer.start(handlers, { fromBeginning: true });
};
