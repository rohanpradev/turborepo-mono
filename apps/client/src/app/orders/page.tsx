import { auth } from "@clerk/nextjs/server";
import { listUserOrders } from "@repo/api-client";
import { getOrderServiceServerUrl } from "@repo/api-client/server";
import { formatUsdFromCents, type OrderRecord } from "@repo/types";
import type { Route } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import RefreshButton from "@/components/RefreshButton";
import { Button } from "@/components/ui/button";

const OrdersContent = async () => {
  // Authentication and private order data must be read for the current request.
  await connection();
  const isClerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("_here") &&
      process.env.CLERK_SECRET_KEY &&
      !process.env.CLERK_SECRET_KEY.includes("_here"),
  );

  if (!isClerkConfigured) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 py-8">
        <h1 className="font-serif text-4xl font-semibold tracking-[-0.035em]">
          Your orders.
        </h1>
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          Order history is unavailable in this environment.
        </p>
      </section>
    );
  }

  const { getToken, userId } = await auth();
  const token = userId ? await getToken() : null;
  if (!token) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 py-8">
        <h1 className="font-serif text-4xl font-semibold tracking-[-0.035em]">
          Your orders.
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to see your order history.
        </p>
        <Button href={"/sign-in?redirect_url=%2Forders" as Route}>
          Sign in
        </Button>
      </section>
    );
  }

  let orders: Array<OrderRecord> = [];
  let error: string | null = null;
  try {
    const response = await listUserOrders(getOrderServiceServerUrl(), {
      token,
    });
    orders = response.data;
  } catch {
    error = "Unable to load your orders right now. Please try again.";
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="space-y-2">
        <h1 className="font-serif text-5xl font-semibold tracking-[-0.045em]">
          Your orders.
        </h1>
        <p className="text-sm text-muted-foreground">
          Your purchases and their latest status.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="space-y-4 rounded-xl border border-dashed border-destructive/25 bg-destructive/8 px-4 py-6 text-sm text-destructive"
        >
          <p>{error}</p>
          <RefreshButton label="Try again" />
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const productOccurrences = new Map<string, number>();
            const displayOrderId = order.orderId ?? order._id;

            return (
              <article
                key={displayOrderId}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Order {displayOrderId}
                    </p>
                    <p className="text-lg font-medium">
                      {formatUsdFromCents(order.amount)}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium capitalize text-emerald-800">
                    {order.status}
                  </span>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {order.products.map((product) => {
                    const baseKey = `${product.name}-${product.price}-${product.quantity}`;
                    const occurrence =
                      (productOccurrences.get(baseKey) ?? 0) + 1;

                    productOccurrences.set(baseKey, occurrence);

                    return (
                      <li
                        key={`${order._id}-${baseKey}-${occurrence}`}
                        className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2"
                      >
                        <span>{product.name}</span>
                        <span>
                          {product.quantity} x{" "}
                          {formatUsdFromCents(product.price)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <p className="mt-4 text-xs text-muted-foreground">
                  Updated {order.updatedAt ?? order.createdAt ?? "recently"}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No orders yet.
        </div>
      )}
    </section>
  );
};

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="py-12">
          Loading your orders…
        </p>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
