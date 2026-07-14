import type { Route } from "next";

export type CheckoutStep = 1 | 2 | 3;

export const normalizeCheckoutStep = (value: string | null): CheckoutStep => {
  const step = Number(value ?? "1");
  return step === 2 || step === 3 ? step : 1;
};

export const getAllowedCheckoutStep = ({
  hasItems,
  hasShippingDetails,
  requestedStep,
}: {
  hasItems: boolean;
  hasShippingDetails: boolean;
  requestedStep: CheckoutStep;
}): CheckoutStep => {
  if (!hasItems) return 1;
  if (requestedStep === 3 && !hasShippingDetails) return 2;
  return requestedStep;
};

export const getCheckoutStepHref = (step: CheckoutStep): Route =>
  step === 1 ? "/cart" : (`/cart?step=${step}` as Route);

export const getCheckoutSessionStatusPath = (sessionId: string) =>
  `/api/checkout/${encodeURIComponent(sessionId)}`;
