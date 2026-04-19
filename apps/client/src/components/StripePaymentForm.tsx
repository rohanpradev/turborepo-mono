"use client";

import { useAuth } from "@clerk/nextjs";
import { createCheckoutSession, getPaymentServiceUrl } from "@repo/api-client";
import { CheckoutElementsProvider } from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";
import CheckoutForm from "@/components/CheckoutForm";
import useCartStore from "@/stores/cartStore";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
type LoadedStripe = Awaited<ReturnType<typeof loadStripe>>;
type StripePromise = Promise<LoadedStripe>;
const stripePromise: StripePromise | null = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;
const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

interface ShippingFormInputs {
  email: string;
  name: string;
  address: string;
  city: string;
  country?: string;
}

const StripePaymentForm = ({
  shippingForm,
}: {
  shippingForm: ShippingFormInputs;
}) => {
  if (!isClerkConfigured) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
        Authentication is not configured for this environment, so checkout is
        currently unavailable.
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
        Stripe is not configured for this environment, so checkout is currently
        unavailable.
      </div>
    );
  }

  return (
    <AuthenticatedStripePaymentForm
      shippingForm={shippingForm}
      stripePromise={stripePromise}
    />
  );
};

const AuthenticatedStripePaymentForm = ({
  shippingForm,
  stripePromise,
}: {
  shippingForm: ShippingFormInputs;
  stripePromise: StripePromise;
}) => {
  const { getToken } = useAuth();
  const { cart } = useCartStore();
  const [token, setToken] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getToken().then((value) => setToken(value));
  }, [getToken]);

  useEffect(() => {
    const createIntent = async () => {
      try {
        if (!token) {
          throw new Error("Authentication required.");
        }

        if (!cart || cart.length === 0) {
          throw new Error("Cart is empty.");
        }

        const totalAmount = cart.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        const response = await createCheckoutSession(
          getPaymentServiceUrl(),
          {
            cart,
            totalAmount,
            shippingInfo: {
              email: shippingForm.email,
              name: shippingForm.name,
              address: {
                line1: shippingForm.address,
                city: shippingForm.city,
                country: shippingForm.country || "US",
              },
            },
          },
          token,
        );

        setClientSecret(response.data.clientSecret);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to start checkout.",
        );
      }
    };

    if (token && cart.length > 0) {
      createIntent();
    }
  }, [cart, shippingForm, token]);

  if (!token) {
    return <div className="p-4">Loading...</div>;
  }

  if (cart.length === 0) {
    return (
      <div className="text-gray-500 p-4">
        <p>Your cart is empty. Please add items to proceed with checkout.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
        {error}
      </div>
    );
  }

  if (!clientSecret) {
    return <div className="p-4">Preparing checkout...</div>;
  }

  return (
    <div id="checkout">
      <CheckoutElementsProvider
        stripe={stripePromise}
        options={{ clientSecret }}
      >
        <CheckoutForm shippingForm={shippingForm} />
      </CheckoutElementsProvider>
    </div>
  );
};

export default StripePaymentForm;
