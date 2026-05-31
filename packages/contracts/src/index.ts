import { oc } from "@orpc/contract";
import {
  categoryPayloadSchema,
  categoryRecordSchema,
  categorySlugParamSchema,
  categoryUpdateSchema,
  checkoutSessionPayloadSchema,
  checkoutSessionStatusQuerySchema,
  orderRecordSchema,
  productIdParamSchema,
  productListQuerySchema,
  productPayloadSchema,
  productRecordSchema,
  productUpdateSchema,
} from "@repo/types";
import { z } from "zod";

const successResponseSchema = <T extends z.ZodType>(schema: T) =>
  z.object({
    success: z.literal(true),
    data: schema,
  });

const messageResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

const productListResponseSchema = successResponseSchema(
  z.array(productRecordSchema),
).extend({
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().positive(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

const checkoutSessionResponseSchema = successResponseSchema(
  z.object({
    clientSecret: z.string(),
    sessionId: z.string(),
  }),
);

const checkoutSessionStatusResponseSchema = successResponseSchema(
  z.object({
    sessionId: z.string(),
    status: z.string(),
    paymentStatus: z.string(),
    customerEmail: z.string().nullable(),
    paymentIntentId: z.string().nullable(),
  }),
);

const integrationEventSchema = z.object({
  id: z.string(),
  source: z.enum(["service", "kafka", "stripe", "checkout", "webhook"]),
  type: z.string(),
  message: z.string(),
  timestamp: z.string(),
  details: z
    .record(z.string(), z.string().or(z.number()).or(z.boolean()).or(z.null()))
    .optional(),
});

const paymentIntegrationEventsResponseSchema = successResponseSchema(
  z.object({
    kafkaUiUrl: z.string(),
    topics: z.object({
      consumes: z.array(z.string()),
      publishes: z.array(z.string()),
    }),
    recentEvents: z.array(integrationEventSchema),
  }),
);

const idPayloadSchema = productIdParamSchema;
const slugPayloadSchema = categorySlugParamSchema;

export const productContract = {
  product: {
    list: oc
      .input(productListQuerySchema.optional())
      .output(productListResponseSchema),
    get: oc
      .input(idPayloadSchema)
      .output(successResponseSchema(productRecordSchema)),
    create: oc
      .input(productPayloadSchema)
      .output(successResponseSchema(productRecordSchema)),
    update: oc
      .input(
        z.object({
          id: productIdParamSchema.shape.id,
          payload: productUpdateSchema,
        }),
      )
      .output(successResponseSchema(productRecordSchema)),
    delete: oc.input(idPayloadSchema).output(messageResponseSchema),
  },
  category: {
    list: oc
      .input(z.void())
      .output(successResponseSchema(z.array(categoryRecordSchema))),
    get: oc
      .input(slugPayloadSchema)
      .output(successResponseSchema(categoryRecordSchema)),
    create: oc
      .input(categoryPayloadSchema)
      .output(successResponseSchema(categoryRecordSchema)),
    update: oc
      .input(
        z.object({
          slug: categorySlugParamSchema.shape.slug,
          payload: categoryUpdateSchema,
        }),
      )
      .output(successResponseSchema(categoryRecordSchema)),
    delete: oc.input(slugPayloadSchema).output(messageResponseSchema),
  },
};

export const orderContract = {
  order: {
    listForUser: oc
      .input(z.void())
      .output(successResponseSchema(z.array(orderRecordSchema))),
    listAll: oc
      .input(z.void())
      .output(successResponseSchema(z.array(orderRecordSchema))),
  },
};

export const paymentContract = {
  checkout: {
    createSession: oc
      .input(checkoutSessionPayloadSchema)
      .output(checkoutSessionResponseSchema),
    getSessionStatus: oc
      .input(checkoutSessionStatusQuerySchema)
      .output(checkoutSessionStatusResponseSchema),
  },
  ops: {
    integrationEvents: oc
      .input(z.void())
      .output(paymentIntegrationEventsResponseSchema),
  },
};

export type ProductContract = typeof productContract;
export type OrderContract = typeof orderContract;
export type PaymentContract = typeof paymentContract;
