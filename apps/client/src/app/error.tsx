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
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-red-700">
        Storefront error
      </span>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Something interrupted this page.
        </h1>
        <p className="text-sm text-gray-500">
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
