import mongoose from "mongoose";

mongoose.set("bufferCommands", false);

let connectPromise: Promise<typeof mongoose> | null = null;

const getMongoUrl = () => {
  const mongoUrl = process.env.MONGO_URL?.trim();

  if (!mongoUrl) {
    throw new Error("MONGO_URL is not defined in environment variables");
  }

  return mongoUrl;
};

export const connectOrderDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    if (!connectPromise) {
      connectPromise = mongoose.connect(getMongoUrl(), {
        autoIndex: process.env.NODE_ENV !== "production",
        serverSelectionTimeoutMS: 5000,
      });
    }

    await connectPromise;
  } catch (error) {
    console.error("Error connecting to Order Database:", error);
    throw error;
  } finally {
    connectPromise = null;
  }
};

export const disconnectOrderDB = async () => {
  if (mongoose.connection.readyState === 0 && !connectPromise) {
    return;
  }

  await mongoose.disconnect();
  connectPromise = null;
};
