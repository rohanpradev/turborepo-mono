import { z } from "zod";
import { type MessageForTopic, type TopicName, Topics } from "./types";

const id = z.string().min(1).max(200);
const amount = z.number().int().min(0).max(99999999);
const product = z.object({
  id,
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: amount,
  categorySlug: z.string().optional(),
  stock: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});
const schemas = {
  [Topics.PRODUCT_CREATED]: product,
  [Topics.PRODUCT_UPDATED]: product.extend({ updatedAt: z.iso.datetime() }),
  [Topics.PRODUCT_DELETED]: z.object({ id, deletedAt: z.iso.datetime() }),
  [Topics.STRIPE_CHECKOUT_COMPLETED]: z.object({
    eventId: id,
    eventType: id,
    sessionId: id,
    source: z.enum(["webhook", "checkout-status", "reconciliation"]),
    occurredAt: z.iso.datetime(),
  }),
  [Topics.PAYMENT_SUCCESSFUL]: z.object({
    orderId: id,
    userId: id,
    email: z.email(),
    amount,
    currency: z.string().regex(/^[a-z]{3}$/),
    status: z.enum(["success", "failed"]),
    paymentMethod: id,
    transactionId: id,
    items: z
      .array(
        z.object({
          productId: id,
          name: z.string().min(1),
          quantity: z.number().int().positive().max(9900),
          price: amount,
          selectedSize: z.string().optional(),
          selectedColor: z.string().optional(),
        }),
      )
      .min(1)
      .max(100),
    deliveryAddress: z
      .object({
        name: z.string(),
        line1: z.string(),
        line2: z.string().nullable().optional(),
        city: z.string(),
        state: z.string().nullable().optional(),
        postalCode: z.string(),
        country: z.literal("US"),
      })
      .optional(),
    processedAt: z.iso.datetime(),
  }),
};

export const validateTopicMessage = <T extends TopicName>(
  topic: T,
  value: unknown,
): MessageForTopic<T> => schemas[topic].parse(value) as MessageForTopic<T>;
