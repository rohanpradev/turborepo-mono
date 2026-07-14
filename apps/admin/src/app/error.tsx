"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="grid min-h-[60vh] place-items-center py-8">
      <div className="max-w-md rounded-2xl border bg-card p-7 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-amber-100 text-amber-800">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">Unable to load this view</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The operations data could not be refreshed. Your navigation and
          existing data remain unchanged.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      </div>
    </section>
  );
}
