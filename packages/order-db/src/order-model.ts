import mongoose from "mongoose";

const { Schema } = mongoose;

export const orderStatus = ["success", "failed"] as const;

const OrderSchema = new Schema(
  {
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

export type OrderSchemaType = mongoose.InferSchemaType<typeof OrderSchema>;

export const Order = mongoose.model("Order", OrderSchema);
