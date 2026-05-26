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

      const emailResult = await checkoutApi.updateEmail(shippingForm.email);
      if (!isActive) {
        return;
      }

      if (emailResult.type === "error") {
        setMessage(emailResult.error.message);
        setIsSyncingDetails(false);
        return;
      }

      const phoneResult = await checkoutApi.updatePhoneNumber(
        shippingForm.phone,
      );
      if (!isActive) {
        return;
      }

      if (phoneResult.type === "error") {
        setMessage("Unable to sync the phone number with Stripe.");
        setIsSyncingDetails(false);
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
      if (!isActive) {
        return;
      }

      if (shippingResult.type === "error") {
        setMessage(shippingResult.error.message);
        setIsSyncingDetails(false);
        return;
      }

      setIsSyncingDetails(false);
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

    setIsLoading(true);
    const result = await checkout.confirm();

    if (result.type === "error") {
      setMessage(result.error.message || "An unexpected error occurred.");
    }

    setIsLoading(false);
  };

  if (checkoutState.type === "loading") {
    return (
      <div className="rounded-[1.25rem] border border-black/5 bg-white/80 p-4 text-sm text-gray-500">
        Loading checkout...
      </div>
    );
  }

  if (checkoutState.type === "error") {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {checkoutState.error.message}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl space-y-6 px-0 py-2 sm:p-4"
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gray-400">
            Delivery
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
            Shipping information
          </h2>
        </div>
        <div className="grid gap-3 rounded-[1.25rem] border border-black/5 bg-white p-4 text-sm shadow-sm sm:grid-cols-2">
          {[
            ["Email", shippingForm.email],
            ["Name", shippingForm.name],
            ["Address", shippingForm.address],
            ["City", shippingForm.city],
            ["Country", shippingForm.country ?? "US"],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">
                {label}
              </p>
              <p className="break-words font-medium text-gray-950">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gray-400">
            Payment
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
            Payment details
          </h2>
        </div>
        <PaymentElement />
        {isSyncingDetails ? (
          <p className="text-sm text-gray-500">
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
        <div className="mt-4 rounded-[1.25rem] border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{message}</p>
        </div>
      )}
    </form>
  );
};

export default CheckoutForm;
