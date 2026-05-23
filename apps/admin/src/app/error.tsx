"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-12 text-center">
      <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-destructive">
        Dashboard error
      </span>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          This admin view could not load.
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          {error.message ||
            "An upstream service or dashboard component failed while rendering."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go to dashboard</Link>
        </Button>
      </div>
    </section>
  );
}
