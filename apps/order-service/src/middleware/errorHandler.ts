import type { Context, Next } from "hono";

export const errorHandler = async (
  c: Context,
  next: Next,
): Promise<Response | undefined> => {
  try {
    await next();
  } catch (error) {
    console.error("Error:", error);
    return c.json(
      {
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
};
