import z from "zod";

export const productSortSchema = z.enum(["asc", "desc", "oldest", "newest"]);

export const productIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const categorySlugParamSchema = z.object({
  slug: z.string().min(1),
});

export const productListQuerySchema = z.object({
  sort: productSortSchema.optional(),
  category: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const productBaseSchema = z.object({
  name: z.string().min(1),
  shortDescription: z.string().min(1).max(60),
  description: z.string().min(1),
  price: z.number().nonnegative(),
  categorySlug: z.string().min(1),
  sizes: z.array(z.string().min(1)).min(1),
  colors: z.array(z.string().min(1)).min(1),
  images: z.record(z.string(), z.string()),
});

export const productPayloadSchema = productBaseSchema.refine(
  (data) => data.colors.every((color) => Boolean(data.images[color])),
  {
    message: "Each selected color must have a matching image.",
    path: ["images"],
  },
);

export const productUpdateSchema = productBaseSchema
  .partial()
  .refine(
    (data) =>
      !data.colors || !data.images
        ? true
        : data.colors.every((color) => Boolean(data.images?.[color])),
    {
      message: "Each selected color must have a matching image.",
      path: ["images"],
    },
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be updated.",
  });

export const categoryPayloadSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const categoryUpdateSchema = categoryPayloadSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be updated.",
  });

export const productRecordSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  price: z.number(),
  sizes: z.array(z.string()),
  colors: z.array(z.string()),
  images: z.record(z.string(), z.string()),
  categorySlug: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const categoryRecordSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  productCount: z.number().int().nonnegative().optional(),
});

export const cartItemSchema = productRecordSchema.extend({
  quantity: z.number().int().positive(),
  selectedSize: z.string().min(1),
  selectedColor: z.string().min(1),
});

export const checkoutShippingInfoSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  address: z.object({
    line1: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(2),
  }),
});

export const checkoutSessionPayloadSchema = z.object({
  cart: z.array(cartItemSchema).min(1),
  totalAmount: z.number().nonnegative(),
  shippingInfo: checkoutShippingInfoSchema,
});

export const checkoutSessionStatusQuerySchema = z.object({
  sessionId: z.string().min(1),
});

export const orderStatusSchema = z.enum(["success", "failed"]);

export const orderProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});

export const orderRecordSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  email: z.string().email(),
  amount: z.number().nonnegative(),
  status: orderStatusSchema,
  products: z.array(orderProductSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const paymentStatusSchema = z.enum([
  "pending",
  "processing",
  "success",
  "failed",
]);

export type ProductSort = z.infer<typeof productSortSchema>;
export type ProductListQuery = {
  sort?: ProductSort;
  category?: string;
  search?: string;
  limit?: number;
};
export type ProductRecord = z.infer<typeof productRecordSchema>;
export type ProductPayload = z.infer<typeof productPayloadSchema>;
export type ProductUpdatePayload = z.infer<typeof productUpdateSchema>;
export type CategoryRecord = z.infer<typeof categoryRecordSchema>;
export type CategoryPayload = z.infer<typeof categoryPayloadSchema>;
export type CategoryUpdatePayload = z.infer<typeof categoryUpdateSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type CheckoutSessionPayload = z.infer<
  typeof checkoutSessionPayloadSchema
>;
export type OrderRecord = z.infer<typeof orderRecordSchema>;
