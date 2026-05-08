import mongoose from "mongoose";

mongoose.set("bufferCommands", false);

let connectPromise: Promise<typeof mongoose> | null = null;

const readPositiveInt = (name: string, fallback: number) => {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

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
        maxPoolSize: readPositiveInt("MONGO_MAX_POOL_SIZE", 20),
        maxIdleTimeMS: readPositiveInt("MONGO_MAX_IDLE_TIME_MS", 30000),
        serverSelectionTimeoutMS: readPositiveInt(
          "MONGO_SERVER_SELECTION_TIMEOUT_MS",
          5000,
        ),
        waitQueueTimeoutMS: readPositiveInt(
          "MONGO_WAIT_QUEUE_TIMEOUT_MS",
          5000,
        ),
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
