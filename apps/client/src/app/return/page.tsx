import { Suspense } from "react";
import ReturnClient from "./ReturnClient";

export const instant = false;

export default function ReturnPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Loading payment status"
          className="flex min-h-[60vh] items-center justify-center bg-background"
        >
          <div className="size-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
        </div>
      }
    >
      <ReturnClient />
    </Suspense>
  );
}
