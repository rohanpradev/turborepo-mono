"use client";

import { useAuth } from "@clerk/nextjs";
import { CheckoutElementsProvider } from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useRef, useState } from "react";
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
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("_here"),
);

type ShippingFormInputs = BaseShippingFormInputs & {
  country?: string;
};

const createCheckoutRequest = async (
  payload: unknown,
  abortController: AbortController,
) => {
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    abortController.abort();
  }, 20_000);

  try {
    return await fetch("/api/checkout", {
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: abortController.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new Error("Checkout is taking too long. Please try again.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const StripePaymentForm = ({
  shippingForm,
}: {
  shippingForm: ShippingFormInputs;
}) => {
  if (!isClerkConfigured) {
    return (
      <div
        role="alert"
        className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 p-4 text-sm text-gray-600"
      >
        Authentication is not configured for this environment, so checkout is
        currently unavailable.
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div
        role="alert"
        className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 p-4 text-sm text-gray-600"
      >
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
  const { isLoaded, isSignedIn } = useAuth();
  const cart = useCartStore((state) => state.cart);
  const checkoutAttemptId = useRef(crypto.randomUUID());
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();

    if (!isSignedIn || cart.length === 0) {
      setClientSecret(null);
      setError(null);

      return () => {
        isActive = false;
        abortController.abort();
      };
    }

    const createIntent = async () => {
      setError(null);
      setClientSecret(null);

      try {
        const checkoutPayload = {
          checkoutAttemptId: checkoutAttemptId.current,
          cart: cart.map(({ id, quantity, selectedColor, selectedSize }) => ({
            id,
            quantity,
            selectedColor,
            selectedSize,
          })),
        };
        const response = await createCheckoutRequest(
          checkoutPayload,
          abortController,
        );

        const responseBody = (await response.json()) as
          | { message: string }
          | { data: { clientSecret: string } };

        if (!response.ok || !("data" in responseBody)) {
          throw new Error(
            "message" in responseBody
              ? responseBody.message
              : "Unable to start checkout.",
          );
        }

        if (isActive) {
          setClientSecret(responseBody.data.clientSecret);
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
      abortController.abort();
    };
  }, [cart, attempt, isSignedIn]);

  if (!isLoaded) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-[1.5rem] border border-black/5 bg-white/80 p-4 text-sm text-gray-600"
      >
        Loading checkout context...
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div
        role="alert"
        className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 p-4 text-sm text-gray-600"
      >
        <p>
          {error ?? "Authentication is required before checkout can start."}
        </p>
        <button
          type="button"
          className="mt-3 font-medium text-gray-950 underline underline-offset-4"
          onClick={() => {
            setError(null);
            setAttempt((value) => value + 1);
          }}
        >
          Retry checkout
        </button>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div
        role="status"
        className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 p-4 text-sm text-gray-600"
      >
        <p>Your cart is empty. Please add items to proceed with checkout.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-[1.5rem] border border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        <p>{error}</p>
        <button
          type="button"
          className="mt-3 font-medium text-gray-950 underline underline-offset-4"
          onClick={() => {
            setError(null);
            setClientSecret(null);
            setAttempt((value) => value + 1);
          }}
        >
          Retry checkout
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-[1.5rem] border border-black/5 bg-white/80 p-4 text-sm text-gray-600"
      >
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
