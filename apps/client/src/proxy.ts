import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("_here") &&
    process.env.CLERK_SECRET_KEY &&
    !process.env.CLERK_SECRET_KEY.includes("_here"),
);
const isPublicPath = (pathname: string) =>
  pathname === "/" ||
  pathname === "/api/health" ||
  pathname === "/robots.txt" ||
  pathname === "/sitemap.xml" ||
  pathname === "/diagnostics" ||
  pathname === "/products" ||
  pathname.startsWith("/products/") ||
  pathname === "/sign-in" ||
  pathname.startsWith("/sign-in/") ||
  pathname === "/sign-up" ||
  pathname.startsWith("/sign-up/");
const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const protectedProxy = clerkMiddleware(
  async (auth, req) => {
    if (!isPublicPath(req.nextUrl.pathname)) {
      await auth.protect({
        unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
      });
    }
  },
  authorizedParties?.length ? { authorizedParties } : undefined,
);

export default isClerkConfigured ? protectedProxy : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc|__clerk)(.*)",
  ],
};
