import mongoose from "mongoose";

const { Schema } = mongoose;

export const orderStatus = ["success", "failed"] as const;

const OrderSchema = new Schema(
  {
    orderId: { type: String, required: true },
    userId: { type: String, required: true },
    email: { type: String, required: true },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
    status: { type: String, enum: orderStatus, required: true },
    currency: { type: String, default: "usd", match: /^[a-z]{3}$/ },
    transactionId: String,
    fulfillmentStatus: {
      type: String,
      enum: ["unfulfilled", "fulfilled", "cancelled"],
      default: "unfulfilled",
    },
    deliveryAddress: {
      type: new Schema(
        {
          name: String,
          line1: String,
          line2: String,
          city: String,
          state: String,
          postalCode: String,
          country: { type: String, enum: ["US"] },
        },
        { _id: false },
      ),
      default: undefined,
    },
    products: {
      type: [
        {
          productId: String,
          selectedSize: String,
          selectedColor: String,
          name: { type: String, required: true },
          price: {
            type: Number,
            required: true,
            min: 0,
            validate: Number.isSafeInteger,
          },
          quantity: {
            type: Number,
            required: true,
            min: 1,
            validate: Number.isSafeInteger,
          },
        },
      ],
      required: true,
      validate: (products: unknown[]) => products.length > 0,
    },
  },
  { timestamps: true },
);

OrderSchema.index(
  { orderId: 1 },
  { partialFilterExpression: { orderId: { $type: "string" } }, unique: true },
);
OrderSchema.index({ userId: 1, createdAt: -1, _id: -1 });
OrderSchema.index({ createdAt: -1, _id: -1 });

export type OrderSchemaType = mongoose.InferSchemaType<typeof OrderSchema>;

export const Order = mongoose.model("Order", OrderSchema);
