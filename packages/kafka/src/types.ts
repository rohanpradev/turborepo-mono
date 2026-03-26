// Define your Kafka topics as a const object for type safety
export const Topics = {
  PRODUCT_CREATED: "product.created",
  PRODUCT_DELETED: "product.deleted",
  PAYMENT_SUCCESSFUL: "payment.successful",
} as const;

// Extract the topic names as a union type
export type TopicName = (typeof Topics)[keyof typeof Topics];

// Define message types for each topic
export interface ProductCreatedMessage {
  id: string;
  name: string;
  description?: string;
  price: number;
  categorySlug?: string;
  stock: number;
  imageUrl?: string;
  createdAt: string;
}

export interface ProductDeletedMessage {
  id: string;
  deletedAt: string;
}

export interface PaymentSuccessfulMessage {
  orderId: string;
  userId: string;
  email: string;
  amount: number;
  currency: string;
  status: "success" | "failed";
  paymentMethod: string;
  transactionId: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  processedAt: string;
}

// Map topics to their message types
export interface TopicMessageMap {
  [Topics.PRODUCT_CREATED]: ProductCreatedMessage;
  [Topics.PRODUCT_DELETED]: ProductDeletedMessage;
  [Topics.PAYMENT_SUCCESSFUL]: PaymentSuccessfulMessage;
}

// Helper type to get message type from topic
export type MessageForTopic<T extends TopicName> = TopicMessageMap[T];
