"use client";

import { PaymentElement, useCheckout } from "@stripe/react-stripe-js/checkout";
import { type SubmitEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ShippingFormInputs as BaseShippingFormInputs } from "@/types";

type ShippingFormInputs = BaseShippingFormInputs & {
  country?: string;
};

const CheckoutForm = ({
  shippingForm,
}: {
  shippingForm: ShippingFormInputs;
}) => {
  const checkoutState = useCheckout();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingDetails, setIsSyncingDetails] = useState(false);
  const checkout =
    checkoutState.type === "success" ? checkoutState.checkout : null;
  const checkoutRef = useRef<typeof checkout>(null);
  const checkoutSessionId = checkout?.id ?? null;

  checkoutRef.current = checkout;

  useEffect(() => {
    const checkoutApi = checkoutRef.current;

    if (!checkoutSessionId || !checkoutApi) {
      setIsSyncingDetails(false);
      return;
    }

    let isActive = true;

    const syncCheckoutDetails = async () => {
      setIsSyncingDetails(true);
      setMessage(null);

      try {
        const emailResult = await checkoutApi.updateEmail(shippingForm.email);
        if (!isActive) return;

        if (emailResult.type === "error") {
          setMessage(emailResult.error.message);
          return;
        }

        const phoneResult = await checkoutApi.updatePhoneNumber(
          shippingForm.phone,
        );
        if (!isActive) return;

        if (phoneResult.type === "error") {
          setMessage("Unable to sync the phone number with Stripe.");
          return;
        }

        const shippingResult = await checkoutApi.updateShippingAddress({
          name: shippingForm.name,
          address: {
            line1: shippingForm.address,
            city: shippingForm.city,
            country: shippingForm.country ?? "US",
          },
        });
        if (!isActive) return;

        if (shippingResult.type === "error") {
          setMessage(shippingResult.error.message);
        }
      } catch {
        if (isActive) {
          setMessage(
            "Unable to sync delivery details. Check your connection and try again.",
          );
        }
      } finally {
        if (isActive) {
          setIsSyncingDetails(false);
        }
      }
    };

    void syncCheckoutDetails();

    return () => {
      isActive = false;
    };
  }, [
    checkoutSessionId,
    shippingForm.address,
    shippingForm.city,
    shippingForm.country,
    shippingForm.email,
    shippingForm.name,
    shippingForm.phone,
  ]);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!checkout) {
      return;
    }

    setMessage(null);
    setIsLoading(true);

    try {
      const result = await checkout.confirm();

      if (result.type === "error") {
        setMessage(result.error.message || "Unable to complete payment.");
      }
    } catch {
      setMessage(
        "Payment confirmation was interrupted. Check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (checkoutState.type === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-border bg-muted/55 p-4 text-sm text-muted-foreground"
      >
        Loading checkout...
      </div>
    );
  }

  if (checkoutState.type === "error") {
    return (
      <div
        role="alert"
        className="rounded-xl border border-dashed border-destructive/25 bg-destructive/8 p-4 text-sm text-destructive"
      >
        {checkoutState.error.message}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isLoading || isSyncingDetails}
      className="mx-auto w-full max-w-2xl space-y-6 px-0 py-2 sm:p-4"
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Delivery
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Shipping information
          </h2>
        </div>
        <div className="grid gap-3 rounded-xl border border-border bg-muted/45 p-4 text-sm sm:grid-cols-2">
          {[
            ["Email", shippingForm.email],
            ["Name", shippingForm.name],
            ["Address", shippingForm.address],
            ["City", shippingForm.city],
            ["Country", shippingForm.country ?? "US"],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {label}
              </p>
              <p className="break-words font-medium text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Payment
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Payment details
          </h2>
        </div>
        <PaymentElement />
        {isSyncingDetails ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-muted-foreground"
          >
            Syncing shipping details with Stripe...
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={isLoading || isSyncingDetails || !checkout}
        className="w-full"
        size="lg"
      >
        <span id="button-text">{isLoading ? "Processing..." : "Pay now"}</span>
      </Button>

      {message && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-destructive/25 bg-destructive/8 p-4"
        >
          <p className="text-sm text-destructive">{message}</p>
        </div>
      )}
    </form>
  );
};

export default CheckoutForm;
