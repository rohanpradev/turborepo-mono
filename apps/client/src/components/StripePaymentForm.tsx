"use client";

import { useAuth } from "@clerk/nextjs";
import { createCheckoutSession, getPaymentServiceUrl } from "@repo/api-client";
import { CheckoutElementsProvider } from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";
import CheckoutForm from "@/components/CheckoutForm";
import { Badge } from "@/components/ui/badge";
import useCartStore from "@/stores/cartStore";
import type { ShippingFormInputs as BaseShippingFormInputs } from "@/types";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
type LoadedStripe = Awaited<ReturnType<typeof loadStripe>>;
type StripePromise = Promise<LoadedStripe>;
const stripePromise: StripePromise | null = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;
const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

type ShippingFormInputs = BaseShippingFormInputs & {
  country?: string;
};

const StripePaymentForm = ({
  shippingForm,
}: {
  shippingForm: ShippingFormInputs;
}) => {
  if (!isClerkConfigured) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 p-4 text-sm text-gray-500">
        Authentication is not configured for this environment, so checkout is
        currently unavailable.
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 p-4 text-sm text-gray-500">
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
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void getToken().then((value) => {
      if (isActive) {
        setToken(value);
      }
    });

    return () => {
      isActive = false;
    };
  }, [getToken]);

  useEffect(() => {
    let isActive = true;

    if (!token || cart.length === 0) {
      setClientSecret(null);
      setError(null);

      return () => {
        isActive = false;
      };
    }

    const createIntent = async () => {
      setError(null);
      setClientSecret(null);

      try {
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

        if (isActive) {
          setClientSecret(response.data.clientSecret);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to start checkout.",
          );
        }
      }
    };

    void createIntent();

    return () => {
      isActive = false;
    };
  }, [
    cart,
    shippingForm.address,
    shippingForm.city,
    shippingForm.country,
    shippingForm.email,
    shippingForm.name,
    token,
  ]);

  if (token === undefined) {
    return (
      <div className="rounded-[1.5rem] border border-black/5 bg-white/80 p-4 text-sm text-gray-500">
        Loading checkout context...
      </div>
    );
  }

  if (token === null) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 p-4 text-sm text-gray-500">
        Authentication is required before checkout can start.
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 p-4 text-sm text-gray-500">
        <p>Your cart is empty. Please add items to proceed with checkout.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 p-4 text-sm text-gray-500">
        {error}
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="rounded-[1.5rem] border border-black/5 bg-white/80 p-4 text-sm text-gray-500">
        Preparing checkout...
      </div>
    );
  }

  return (
    <div
      id="checkout"
      className="rounded-[1.5rem] border border-black/5 bg-white/80 p-5 shadow-sm"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <Badge variant="outline" className="bg-white/80 text-gray-700">
            Secure payment
          </Badge>
          <p className="mt-2 text-sm text-gray-600">
            Review the payment details and complete your order securely with
            Stripe.
          </p>
        </div>
      </div>
      <CheckoutElementsProvider
        key={clientSecret}
        stripe={stripePromise}
        options={{ clientSecret }}
      >
        <CheckoutForm shippingForm={shippingForm} />
      </CheckoutElementsProvider>
    </div>
  );
};

export default StripePaymentForm;
