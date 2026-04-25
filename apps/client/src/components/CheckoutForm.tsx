"use client";

import { PaymentElement, useCheckout } from "@stripe/react-stripe-js/checkout";
import { type SubmitEvent, useEffect, useRef, useState } from "react";
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
    return <div className="p-4">Loading checkout...</div>;
  }

  if (checkoutState.type === "error") {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
        {checkoutState.error.message}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl space-y-6 px-0 py-2 sm:p-6"
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Shipping Information</h2>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <p className="text-sm">
            <span className="font-medium">Email:</span> {shippingForm.email}
          </p>
          <p className="text-sm">
            <span className="font-medium">Name:</span> {shippingForm.name}
          </p>
          <p className="text-sm">
            <span className="font-medium">Address:</span> {shippingForm.address}
          </p>
          <p className="text-sm">
            <span className="font-medium">City:</span> {shippingForm.city}
          </p>
          {shippingForm.country && (
            <p className="text-sm">
              <span className="font-medium">Country:</span>{" "}
              {shippingForm.country}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Payment Details</h2>
        <PaymentElement />
        {isSyncingDetails ? (
          <p className="text-sm text-gray-500">
            Syncing shipping details with Stripe...
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isLoading || isSyncingDetails || !checkout}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium
                   hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                   transition-colors"
      >
        <span id="button-text">{isLoading ? "Processing..." : "Pay now"}</span>
      </button>

      {/* Show any error or success messages */}
      {message && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{message}</p>
        </div>
      )}
    </form>
  );
};

export default CheckoutForm;
