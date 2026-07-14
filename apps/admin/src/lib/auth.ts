import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { cache } from "react";

type AdminSessionClaims = {
  role?: string;
  metadata?: { role?: string };
  publicMetadata?: { role?: string };
  public_metadata?: { role?: string };
};

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

const getClaimRole = (claims: AdminSessionClaims | null | undefined) =>
  claims?.role ??
  claims?.metadata?.role ??
  claims?.publicMetadata?.role ??
  claims?.public_metadata?.role;

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

  const claims = session.sessionClaims as AdminSessionClaims | null;
  const isAdmin =
    session.has({ role: "org:admin" }) ||
    getClaimRole(claims) === "admin" ||
    adminUserIds.has(session.userId);

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
