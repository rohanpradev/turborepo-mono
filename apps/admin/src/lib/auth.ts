import "server-only";

import { auth } from "@clerk/nextjs/server";
import { type CustomJwtSessionClaims, isPlatformAdmin } from "@repo/types";
import { notFound } from "next/navigation";
import { cache } from "react";

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("_here") &&
    process.env.CLERK_SECRET_KEY &&
    !process.env.CLERK_SECRET_KEY.includes("_here"),
);

const adminUserIds = new Set(
  process.env.ADMIN_USER_IDS?.split(",")
    .map((userId) => userId.trim())
    .filter(Boolean) ?? [],
);

/**
 * Protects each privileged resource directly. Proxy redirects are a UX layer;
 * this check is the authorization boundary and deliberately fails closed.
 */
export const requireAdminAccess = cache(async () => {
  if (!isClerkConfigured) {
    notFound();
  }

  const session = await auth();

  if (!session.isAuthenticated || !session.userId) {
    return session.redirectToSignIn();
  }

  const isAdmin = isPlatformAdmin(
    session.userId,
    session.sessionClaims as CustomJwtSessionClaims,
    adminUserIds,
  );

  if (!isAdmin) {
    notFound();
  }

  const token = await session.getToken();

  if (!token) {
    notFound();
  }

  return {
    token,
    userId: session.userId,
  };
});
