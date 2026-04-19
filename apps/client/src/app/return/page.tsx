"use client";

import {
  getCheckoutSessionStatus,
  getPaymentServiceUrl,
} from "@repo/api-client";
import { ArrowRight, CheckCircle2, ShoppingBag } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useCartStore from "@/stores/cartStore";

function ReturnContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>("processing");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const { clearCart } = useCartStore();
  const isPaid = status === "paid";

  useEffect(() => {
    const currentSessionId = searchParams.get("session_id");

    if (!currentSessionId) {
      setStatus("default");
      return;
    }

    getCheckoutSessionStatus(getPaymentServiceUrl(), currentSessionId)
      .then((response) => {
        setSessionId(response.data.sessionId);
        setPaymentIntentId(response.data.paymentIntentId);
        setStatus(response.data.paymentStatus);

        if (response.data.paymentStatus === "paid") {
          clearCart();
        }
      })
      .catch(() => {
        setStatus("default");
      });
  }, [clearCart, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-3xl border bg-white p-6 shadow-sm sm:p-10">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-12 items-center justify-center rounded-full ${
              isPaid
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isPaid ? (
              <CheckCircle2 className="size-6" />
            ) : (
              <ShoppingBag className="size-6" />
            )}
          </div>
          <div>
            <Badge
              variant={isPaid ? "default" : "outline"}
              className={
                isPaid ? "bg-emerald-600" : "border-amber-200 text-amber-700"
              }
            >
              {isPaid ? "Payment complete" : "Payment status"}
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isPaid
                ? "Your order was paid successfully."
                : `Checkout ${status}.`}
            </h1>
          </div>
        </div>

        <p className="max-w-xl text-sm text-muted-foreground">
          {isPaid
            ? "Your payment is confirmed, the cart has been cleared, and the order is ready for the next step."
            : "We are still verifying the checkout session. You can safely return to the cart or continue browsing."}
        </p>

        {(sessionId || paymentIntentId) && (
          <div className="rounded-2xl border bg-gray-50 p-4">
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              {sessionId && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Session
                  </p>
                  <p className="break-all font-mono text-xs text-gray-900">
                    {sessionId}
                  </p>
                </div>
              )}
              {paymentIntentId && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Payment Intent
                  </p>
                  <p className="break-all font-mono text-xs text-gray-900">
                    {paymentIntentId}
                  </p>
                </div>
              )}
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </p>
                <p className="text-sm font-medium text-gray-900">{status}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="/" className="w-full sm:w-auto">
            Continue shopping
            <ArrowRight className="size-4" />
          </Button>
          {!isPaid && (
            <Button href="/cart" variant="outline" className="w-full sm:w-auto">
              Back to cart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
