import { describe, expect, it } from "bun:test";
import {
  getAllowedCheckoutStep,
  getCheckoutSessionStatusPath,
  getCheckoutStepHref,
  normalizeCheckoutStep,
} from "../apps/client/src/lib/checkout";

describe("storefront checkout navigation", () => {
  it("normalizes malformed steps to the cart", () => {
    expect(normalizeCheckoutStep(null)).toBe(1);
    expect(normalizeCheckoutStep("999")).toBe(1);
    expect(normalizeCheckoutStep("payment")).toBe(1);
    expect(getCheckoutStepHref(1)).toBe("/cart");
  });

  it("keeps empty carts at step one", () => {
    expect(
      getAllowedCheckoutStep({
        hasItems: false,
        hasShippingDetails: true,
        requestedStep: 3,
      }),
    ).toBe(1);
  });

  it("requires delivery details before payment", () => {
    expect(
      getAllowedCheckoutStep({
        hasItems: true,
        hasShippingDetails: false,
        requestedStep: 3,
      }),
    ).toBe(2);
    expect(getCheckoutStepHref(2)).toBe("/cart?step=2");
  });

  it("keeps authenticated payment status behind the storefront origin", () => {
    expect(getCheckoutSessionStatusPath("cs_test/with spaces")).toBe(
      "/api/checkout/cs_test%2Fwith%20spaces",
    );
  });
});
