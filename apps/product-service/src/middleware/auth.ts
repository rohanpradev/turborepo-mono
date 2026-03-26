import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import type { CustomJwtSessionClaims } from "@repo/types";
import { createMiddleware } from "hono/factory";

export type ServiceVariables = {
  userId: string;
};

const getClerkConfig = () =>
  (process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  process.env.CLERK_SECRET_KEY
    ? {
        publishableKey:
          process.env.CLERK_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        secretKey: process.env.CLERK_SECRET_KEY,
      }
    : null;

export const clerkAuthMiddleware = createMiddleware(async (c, next) => {
  const clerkConfig = getClerkConfig();

  if (!clerkConfig) {
    await next();
    return;
  }

  return clerkMiddleware(clerkConfig)(c, next);
});

export const shouldBeUser = createMiddleware<{ Variables: ServiceVariables }>(
  async (c, next) => {
    if (!getClerkConfig()) {
      return c.json(
        {
          success: false as const,
          error: "Clerk auth is not configured for this environment.",
        },
        503,
      );
    }

    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    c.set("userId", auth.userId);
    await next();
  },
);

export const shouldBeAdmin = createMiddleware<{ Variables: ServiceVariables }>(
  async (c, next) => {
    if (!getClerkConfig()) {
      return c.json(
        {
          success: false as const,
          error: "Clerk auth is not configured for this environment.",
        },
        503,
      );
    }

    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const claims = auth.sessionClaims as CustomJwtSessionClaims | undefined;

    if (claims?.metadata?.role !== "admin") {
      return c.json({ success: false, error: "Forbidden" }, 403);
    }

    c.set("userId", auth.userId);
    await next();
  },
);
