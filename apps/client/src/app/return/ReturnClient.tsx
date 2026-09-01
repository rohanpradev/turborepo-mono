"use client";

import type { CheckoutSessionStatusResponse } from "@repo/api-client";
import { ArrowRight, CheckCircle2, ShoppingBag } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCheckoutSessionStatusPath } from "@/lib/checkout";
import useCartStore from "@/stores/cartStore";
import useCheckoutStore from "@/stores/checkoutStore";

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("_here"),
);

function AuthenticatedReturnContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>("processing");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const { clearCart } = useCartStore();
  const { clearShippingForm } = useCheckoutStore();
  const isPaid = status === "paid";

  useEffect(() => {
    const currentSessionId = searchParams.get("session_id");
    let isActive = true;
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;

    if (!currentSessionId) {
      setStatus("unavailable");
      return;
    }

    setStatus("processing");

    const verifySession = async (pollCount: number) => {
      try {
        const response = await fetch(
          getCheckoutSessionStatusPath(currentSessionId),
          {
            cache: "no-store",
            headers: { accept: "application/json" },
          },
        );
        const payload = (await response
          .json()
          .catch(() => null)) as CheckoutSessionStatusResponse | null;

        if (!response.ok || !payload?.success) {
          throw new Error("Payment verification is unavailable.");
        }

        if (isActive) {
          setSessionId(payload.data.sessionId);
          setPaymentIntentId(payload.data.paymentIntentId);
          setStatus(payload.data.paymentStatus);

          if (payload.data.paymentStatus === "paid") {
            clearCart();
            clearShippingForm();
          } else if (pollCount < 4) {
            pollTimeout = setTimeout(
              () => void verifySession(pollCount + 1),
              2_000,
            );
          }
        }
      } catch {
        if (isActive) {
          setStatus("unavailable");
        }
      }
    };

    void verifySession(0);

    return () => {
      isActive = false;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [clearCart, clearShippingForm, searchParams, verificationAttempt]);

  return (
    <div className="min-h-[60vh] px-0 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:p-10">
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
            <h1 className="font-serif text-3xl font-semibold tracking-[-0.035em]">
              {isPaid
                ? "Your order was paid successfully."
                : `Checkout ${status}.`}
            </h1>
          </div>
        </div>

        <p
          role="status"
          aria-live="polite"
          className="max-w-xl text-sm text-muted-foreground"
        >
          {isPaid
            ? "Your payment is confirmed, the cart has been cleared, and the order is ready for the next step."
            : "We are still verifying the checkout session. You can safely return to the cart or continue browsing."}
        </p>

        {(sessionId || paymentIntentId) && (
          <div className="rounded-xl border border-border bg-muted/55 p-4">
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              {sessionId && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Session
                  </p>
                  <p className="break-all font-mono text-xs text-foreground">
                    {sessionId}
                  </p>
                </div>
              )}
              {paymentIntentId && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Payment Intent
                  </p>
                  <p className="break-all font-mono text-xs text-foreground">
                    {paymentIntentId}
                  </p>
                </div>
              )}
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </p>
                <p className="text-sm font-medium text-foreground">{status}</p>
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
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setVerificationAttempt((value) => value + 1)}
              >
                Verify again
              </Button>
              <Button
                href="/cart"
                variant="outline"
                className="w-full sm:w-auto"
              >
                Back to cart
              </Button>
            </>
          )}
          {isPaid ? (
            <Button
              href="/orders"
              variant="outline"
              className="w-full sm:w-auto"
            >
              View orders
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReturnContent() {
  if (isClerkConfigured) {
    return <AuthenticatedReturnContent />;
  }

  return (
    <div className="min-h-[60vh] px-0 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:p-10">
        <Badge variant="outline" className="w-fit">
          Payment status unavailable
        </Badge>
        <h1 className="font-serif text-3xl font-semibold tracking-[-0.035em]">
          Authentication is not configured.
        </h1>
        <p className="text-sm text-muted-foreground">
          Add valid Clerk credentials to verify an authenticated checkout
          session.
        </p>
        <Button href="/" className="w-fit">
          Continue shopping
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

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
      <ReturnContent />
    </Suspense>
  );
}
