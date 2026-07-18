"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { getOrderServiceUrl, listUserOrders } from "@repo/api-client";
import type { OrderRecord } from "@repo/types";
import { formatUsdFromCents } from "@repo/types";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("_here"),
);

const OrdersContent = () => {
  const { getToken, isLoaded, userId } = useAuth();
  const [orders, setOrders] = useState<Array<OrderRecord>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        if (!userId) {
          setOrders([]);
          setError(null);
          return;
        }

        const token = await getToken();

        if (!token) {
          throw new Error("Authentication token unavailable.");
        }

        const response = await listUserOrders(getOrderServiceUrl(), { token });
        setOrders(response.data);
        setError(null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load orders right now.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (!isLoaded) {
      return;
    }

    setIsLoading(true);
    void loadOrders();
  }, [getToken, isLoaded, userId]);

  if (!isLoaded || isLoading) {
    return (
      <div className="mt-12 flex min-h-[40vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (!userId) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 py-8">
        <h1 className="font-serif text-4xl font-semibold tracking-[-0.035em]">
          Your orders.
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to see your order history.
        </p>
        <SignInButton mode="modal">
          <Button type="button">Sign in</Button>
        </SignInButton>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="space-y-2">
        <h1 className="font-serif text-5xl font-semibold tracking-[-0.045em]">
          Your orders.
        </h1>
        <p className="text-sm text-muted-foreground">
          Payment-backed orders synced from the order service.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-dashed border-destructive/25 bg-destructive/8 px-4 py-6 text-sm text-destructive">
          {error}
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
  if (!isClerkConfigured) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 py-8">
        <h1 className="font-serif text-4xl font-semibold tracking-[-0.035em]">
          Your orders.
        </h1>
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          Authentication is not configured for this environment, so customer
          order history is unavailable.
        </p>
      </section>
    );
  }

  return <OrdersContent />;
}
