import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export const instant = false;

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("_here"),
);

export default function Page() {
  if (!isClerkConfigured) {
    return (
      <div className="mt-12 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Authentication is not configured for this environment.
      </div>
    );
  }

  return (
    <Suspense
      fallback={<div className="min-h-96 animate-pulse rounded-xl bg-muted" />}
    >
      <SignIn />
    </Suspense>
  );
}
