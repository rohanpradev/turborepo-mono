"use client";

import { PaymentElement, useCheckout } from "@stripe/react-stripe-js/checkout";
import { type FormEvent, useState } from "react";

interface ShippingFormInputs {
  email: string;
  name: string;
  address: string;
  city: string;
  country?: string;
}

const CheckoutForm = ({
  shippingForm,
}: {
  shippingForm: ShippingFormInputs;
}) => {
  const checkoutState = useCheckout();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (checkoutState.type !== "success") {
      return;
    }

    setIsLoading(true);

    const { checkout } = checkoutState;
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
      </div>

      <button
        type="submit"
        disabled={isLoading || !checkoutState.checkout}
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
