import { Suspense } from "react";
import CartClient from "./CartClient";

export const instant = false;

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Loading cart"
          className="flex min-h-[50vh] items-center justify-center bg-background"
        >
          <div className="size-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
        </div>
      }
    >
      <CartClient />
    </Suspense>
  );
}
