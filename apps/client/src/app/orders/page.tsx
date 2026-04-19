"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { getOrderServiceUrl, listUserOrders } from "@repo/api-client";
import type { OrderRecord } from "@repo/types";
import { formatUsdFromCents } from "@repo/types";
import { useEffect, useState } from "react";

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
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
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-800" />
      </div>
    );
  }

  if (!userId) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 py-8">
        <h1 className="text-2xl font-semibold">Your Orders</h1>
        <p className="text-sm text-gray-500">
          Sign in to see your order history.
        </p>
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white"
          >
            Sign in
          </button>
        </SignInButton>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Your Orders</h1>
        <p className="text-sm text-gray-500">
          Payment-backed orders synced from the order service.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-dashed border-red-300 bg-red-50 px-4 py-6 text-sm text-red-700">
          {error}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const productOccurrences = new Map<string, number>();

            return (
              <article
                key={order._id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Order {order._id}</p>
                    <p className="text-lg font-medium">
                      {formatUsdFromCents(order.amount)}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                    {order.status}
                  </span>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  {order.products.map((product) => {
                    const baseKey = `${product.name}-${product.price}-${product.quantity}`;
                    const occurrence =
                      (productOccurrences.get(baseKey) ?? 0) + 1;

                    productOccurrences.set(baseKey, occurrence);

                    return (
                      <li
                        key={`${order._id}-${baseKey}-${occurrence}`}
                        className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2"
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

                <p className="mt-4 text-xs text-gray-500">
                  Updated {order.updatedAt ?? order.createdAt ?? "recently"}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
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
        <h1 className="text-2xl font-semibold">Your Orders</h1>
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
          Authentication is not configured for this environment, so customer
          order history is unavailable.
        </p>
      </section>
    );
  }

  return <OrdersContent />;
}
