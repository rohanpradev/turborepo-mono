import z from "zod";

export const MAX_CART_ITEM_QUANTITY = 99;
export const MAX_CHECKOUT_LINE_ITEMS = 100;
export const MAX_USD_AMOUNT_CENTS = 99_999_999;
export const MIN_USD_CHARGE_CENTS = 50;

export const productSortSchema = z.enum(["asc", "desc", "oldest", "newest"]);

export const productIdParamSchema = z.strictObject({
  id: z.coerce.number().int().positive(),
});

export const categorySlugParamSchema = z.strictObject({
  slug: z.string().min(1),
});

export const productListQuerySchema = z.strictObject({
  sort: productSortSchema.optional(),
  category: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().max(10_000).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const httpImageUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = value.slice(0, value.indexOf(":") + 1);
    return protocol === "http:" || protocol === "https:";
  });

const isSupportedImagePath = (value: string) => {
  if (/\s/.test(value)) {
    return false;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  return httpImageUrlSchema.safeParse(value).success;
};

const productBaseSchema = z.strictObject({
  name: z.string().min(1),
  shortDescription: z.string().min(1).max(60),
  description: z.string().min(1),
  price: z.number().int().nonnegative().max(MAX_USD_AMOUNT_CENTS),
  categorySlug: z.string().min(1),
  sizes: z.array(z.string().min(1)).min(1),
  colors: z.array(z.string().min(1)).min(1),
  images: z.record(
    z.string(),
    z
      .string()
      .min(1)
      .refine((value) => isSupportedImagePath(value), {
        message: "Image must be an HTTP(S) URL or a root-relative path.",
      }),
  ),
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

export const categoryPayloadSchema = z.strictObject({
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
  price: z.number().int().nonnegative().max(MAX_USD_AMOUNT_CENTS),
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
  quantity: z.number().int().positive().max(MAX_CART_ITEM_QUANTITY),
  selectedSize: z.string().min(1),
  selectedColor: z.string().min(1),
});

export const checkoutCartItemSchema = z.strictObject({
  id: productIdParamSchema.shape.id,
  quantity: z.number().int().positive().max(MAX_CART_ITEM_QUANTITY),
  selectedSize: z.string().min(1),
  selectedColor: z.string().min(1),
});

export const checkoutSessionPayloadSchema = z.strictObject({
  checkoutAttemptId: z.uuid(),
  cart: z.array(checkoutCartItemSchema).min(1).max(MAX_CHECKOUT_LINE_ITEMS),
});

export const checkoutSessionStatusQuerySchema = z.strictObject({
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
  orderId: z.string().optional(),
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
  page?: number;
  limit?: number;
};
export type ProductRecord = z.infer<typeof productRecordSchema>;
export type ProductPayload = z.infer<typeof productPayloadSchema>;
export type ProductUpdatePayload = z.infer<typeof productUpdateSchema>;
export type CategoryRecord = z.infer<typeof categoryRecordSchema>;
export type CategoryPayload = z.infer<typeof categoryPayloadSchema>;
export type CategoryUpdatePayload = z.infer<typeof categoryUpdateSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type CheckoutCartItem = z.infer<typeof checkoutCartItemSchema>;
export type CheckoutSessionPayload = z.infer<
  typeof checkoutSessionPayloadSchema
>;
export type OrderRecord = z.infer<typeof orderRecordSchema>;
