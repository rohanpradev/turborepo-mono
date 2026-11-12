import { Suspense } from "react";
import { getSingleSearchParam } from "@/lib/search-params";
import CartClient from "./CartClient";

export const instant = false;

async function CartWithStep({
  searchParams,
}: Pick<PageProps<"/cart">, "searchParams">) {
  const { step } = await searchParams;
  return <CartClient step={getSingleSearchParam(step) ?? null} />;
}

export default function CartPage({ searchParams }: PageProps<"/cart">) {
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
      <CartWithStep searchParams={searchParams} />
    </Suspense>
  );
}
