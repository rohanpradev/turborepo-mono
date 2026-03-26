import mongoose from "mongoose";

let isConnected = false;

export const connectOrderDB = async () => {
  if (!process.env.MONGO_URL)
    throw new Error("MONGO_URL is not defined in environment variables");

  try {
    if (isConnected) return;
    await mongoose.connect(process.env.MONGO_URL);
    isConnected = true;
  } catch (error) {
    console.log("Error connecting to Order Database:", error);
    throw error;
  }
};

export const disconnectOrderDB = async () => {
  if (!isConnected) {
    return;
  }

  await mongoose.disconnect();
  isConnected = false;
};
