import { type TopicHandler, Topics } from "@repo/kafka";
import { consumer } from "@/utils/kafka";
import { createOrder } from "@/utils/order";

export const runKafkaSubscriptions = async () => {
  const handlers: Array<TopicHandler<typeof Topics.PAYMENT_SUCCESSFUL>> = [
    {
      topicName: Topics.PAYMENT_SUCCESSFUL,
      topicHandler: async (message) => {
        console.log(
          `Received payment.successful event for order ${message.orderId}`,
        );

        await createOrder({
          userId: message.userId,
          email: message.email,
          amount: message.amount,
          status: message.status,
          products: message.items.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        });
      },
    },
  ];

  await consumer.start(handlers);
};
