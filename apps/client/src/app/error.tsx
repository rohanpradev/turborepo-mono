"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-4 py-12 text-center">
      <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-destructive">
        Storefront error
      </span>
      <div className="space-y-2">
        <h1 className="font-serif text-4xl font-semibold tracking-[-0.035em]">
          Something interrupted this page.
        </h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "The storefront could not render this route."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
        <Button href="/products" variant="outline">
          Browse products
        </Button>
      </div>
    </section>
  );
}
