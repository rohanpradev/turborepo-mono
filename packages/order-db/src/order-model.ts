import mongoose from "mongoose";

const { Schema } = mongoose;

export const orderStatus = ["success", "failed"] as const;

const OrderSchema = new Schema(
  {
    orderId: { type: String, required: true },
    userId: { type: String, required: true },
    email: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: orderStatus, required: true },
    products: {
      type: [
        {
          name: { type: String, required: true },
          price: { type: Number, required: true },
          quantity: { type: Number, required: true },
        },
      ],
      required: true,
    },
  },
  { timestamps: true },
);

OrderSchema.index(
  { orderId: 1 },
  { partialFilterExpression: { orderId: { $type: "string" } }, unique: true },
);
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });

export type OrderSchemaType = mongoose.InferSchemaType<typeof OrderSchema>;

export const Order = mongoose.model("Order", OrderSchema);
