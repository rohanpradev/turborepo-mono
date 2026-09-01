"use client";

import { useAuth } from "@clerk/nextjs";
import { CheckoutElementsProvider } from "@stripe/react-stripe-js/checkout";
import { type Appearance, loadStripe } from "@stripe/stripe-js";
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
const checkoutAppearance: Appearance = {
  theme: "stripe",
  inputs: "spaced",
  labels: "above",
  variables: {
    borderRadius: "10px",
    colorBackground: "#fffefa",
    colorDanger: "#c53c2c",
    colorPrimary: "#a74625",
    colorText: "#282522",
    colorTextSecondary: "#746f69",
    fontFamily: 'Inter, "Avenir Next", "Helvetica Neue", system-ui, sans-serif',
    spacingGridRow: "16px",
  },
};
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

const readCheckoutResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Your checkout session could not be verified. Please sign in again."
        : "Checkout returned an unexpected response. Please try again.",
    );
  }

  try {
    return JSON.parse(body) as
      | { message: string }
      | { data: { clientSecret: string } };
  } catch {
    throw new Error("Checkout returned an invalid response. Please try again.");
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
        className="rounded-xl border border-dashed border-border bg-muted/55 p-4 text-sm text-muted-foreground"
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
        className="rounded-xl border border-dashed border-border bg-muted/55 p-4 text-sm text-muted-foreground"
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

        const responseBody = await readCheckoutResponse(response);

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
        className="rounded-xl border border-border bg-muted/55 p-4 text-sm text-muted-foreground"
      >
        Loading checkout context...
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-dashed border-border bg-muted/55 p-4 text-sm text-muted-foreground"
      >
        <p>
          {error ?? "Authentication is required before checkout can start."}
        </p>
        <button
          type="button"
          className="mt-3 cursor-pointer font-medium text-foreground underline underline-offset-4"
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
        className="rounded-xl border border-dashed border-border bg-muted/55 p-4 text-sm text-muted-foreground"
      >
        <p>Your cart is empty. Please add items to proceed with checkout.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-dashed border-destructive/25 bg-destructive/8 p-4 text-sm text-destructive"
      >
        <p>{error}</p>
        <button
          type="button"
          className="mt-3 cursor-pointer font-medium text-foreground underline underline-offset-4"
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
        className="rounded-xl border border-border bg-muted/55 p-4 text-sm text-muted-foreground"
      >
        Preparing checkout...
      </div>
    );
  }

  return (
    <div id="checkout" className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <Badge
            variant="outline"
            className="bg-background text-muted-foreground"
          >
            Secure payment
          </Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            Review the payment details and complete your order securely with
            Stripe.
          </p>
        </div>
      </div>
      <CheckoutElementsProvider
        key={clientSecret}
        stripe={stripePromise}
        options={{
          clientSecret,
          elementsOptions: { appearance: checkoutAppearance },
        }}
      >
        <CheckoutForm shippingForm={shippingForm} />
      </CheckoutElementsProvider>
    </div>
  );
};

export default StripePaymentForm;
