"use client";

import { formatUsdFromCents, MAX_CART_ITEM_QUANTITY } from "@repo/types";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ShippingForm from "@/components/ShippingForm";
import StripePaymentForm from "@/components/StripePaymentForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPrimaryProductImage, isExternalProductImage } from "@/lib/catalog";
import {
  getAllowedCheckoutStep,
  getCheckoutStepHref,
  normalizeCheckoutStep,
} from "@/lib/checkout";
import useCartStore from "@/stores/cartStore";
import useCheckoutStore from "@/stores/checkoutStore";

const steps = [
  { id: 1, title: "Cart" },
  { id: 2, title: "Shipping" },
  { id: 3, title: "Payment" },
];

const stepHeadings = {
  1: "Review items",
  2: "Delivery details",
  3: "Secure payment",
} as const;

const CartContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const { shippingForm, setShippingForm } = useCheckoutStore();

  const requestedStep = normalizeCheckoutStep(searchParams.get("step"));
  const { cart, removeFromCart, setCartItemQuantity } = useCartStore();
  const subtotalCents = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const hasItems = cart.length > 0;
  const activeStep = hasMounted
    ? getAllowedCheckoutStep({
        hasItems,
        hasShippingDetails: Boolean(shippingForm),
        requestedStep,
      })
    : requestedStep;
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      return;
    }

    const canonicalHref = getCheckoutStepHref(activeStep);
    const currentStep = searchParams.get("step");
    const isCanonical =
      activeStep === 1 ? currentStep === null : currentStep === `${activeStep}`;

    if (!isCanonical) {
      router.replace(canonicalHref, { scroll: false });
    }
  }, [activeStep, hasMounted, router, searchParams]);

  return (
    <div className="space-y-8 pb-10 pt-2">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="p-6 md:p-10">
          <div className="space-y-5">
            <Badge
              variant="outline"
              className="w-fit bg-background px-3 py-1 uppercase tracking-[0.16em] text-muted-foreground"
            >
              Secure checkout
            </Badge>
            <div className="space-y-3">
              <h1 className="font-serif text-5xl font-semibold leading-[0.9] tracking-[-0.05em] text-foreground sm:text-7xl">
                Your bag.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Review your selections, adjust quantities, and continue when
                everything looks right.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:gap-12">
        <div className="w-full flex-1 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Checkout / Step {activeStep}
              </p>
              <h2 className="font-serif text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
                {stepHeadings[activeStep]}
              </h2>
            </div>
            <Badge variant="outline" className="bg-card text-muted-foreground">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="grid gap-2 rounded-xl border border-border bg-card p-2 sm:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex min-w-0 items-center gap-3 rounded-md px-3 py-3 sm:px-4 ${
                  step.id === activeStep
                    ? "bg-foreground text-background"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    step.id === activeStep
                      ? "bg-background/10 text-background"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {step.id}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] opacity-75">
                    Step
                  </p>
                  <p className="truncate text-sm font-medium">{step.title}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            {activeStep === 1 ? (
              hasItems ? (
                <div className="space-y-4">
                  {cart.map((item) => {
                    const imageUrl = getPrimaryProductImage(
                      item,
                      item.selectedColor,
                    );

                    return (
                      <article
                        key={item.id + item.selectedSize + item.selectedColor}
                        className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition hover:border-foreground/20"
                      >
                        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-stretch">
                          <div className="relative min-h-40 overflow-hidden rounded-lg bg-[#efebe4] sm:w-40">
                            <Image
                              src={imageUrl}
                              alt={item.name}
                              width={320}
                              height={320}
                              unoptimized={isExternalProductImage(imageUrl)}
                              quality={75}
                              className="h-40 w-full object-contain p-4 transition duration-700 group-hover:scale-[1.025] sm:h-full"
                              sizes="(min-width: 640px) 160px, 100vw"
                              onError={(event) => {
                                event.currentTarget.srcset = "";
                                event.currentTarget.src = "/featured.png";
                              }}
                            />
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                            <div className="flex min-w-0 items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  {item.categorySlug}
                                </p>
                                <h3 className="line-clamp-2 text-lg font-semibold text-foreground">
                                  {item.name}
                                </h3>
                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                                  {item.shortDescription}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item)}
                                className="cursor-pointer rounded-lg border border-border bg-card p-2 text-muted-foreground transition hover:border-destructive/25 hover:bg-destructive/8 hover:text-destructive"
                                aria-label={`Remove ${item.name}, size ${item.selectedSize}, color ${item.selectedColor}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">
                                Size {item.selectedSize}
                              </Badge>
                              <Badge variant="outline">
                                Color {item.selectedColor}
                              </Badge>
                              <Badge variant="outline">
                                {formatUsdFromCents(item.price)} each
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-end justify-between gap-4">
                              <div className="flex items-center rounded-lg border border-border bg-muted/55 p-1">
                                <button
                                  type="button"
                                  aria-label={`Decrease quantity of ${item.name}`}
                                  className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground"
                                  disabled={item.quantity <= 1}
                                  onClick={() =>
                                    setCartItemQuantity(item, item.quantity - 1)
                                  }
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span
                                  role="status"
                                  aria-live="polite"
                                  className="flex h-9 min-w-10 items-center justify-center px-3 text-sm font-semibold text-foreground"
                                >
                                  <span className="sr-only">
                                    {item.name} quantity
                                  </span>
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Increase quantity of ${item.name}`}
                                  className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground"
                                  disabled={
                                    item.quantity >= MAX_CART_ITEM_QUANTITY
                                  }
                                  onClick={() =>
                                    setCartItemQuantity(item, item.quantity + 1)
                                  }
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="text-left sm:text-right">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  Line total
                                </p>
                                <p className="break-words text-2xl font-semibold text-foreground">
                                  {formatUsdFromCents(
                                    item.price * item.quantity,
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                  Your cart is empty.
                </div>
              )
            ) : activeStep === 2 ? (
              <ShippingForm
                initialValues={shippingForm}
                setShippingForm={setShippingForm}
              />
            ) : activeStep === 3 && !hasMounted ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-sm text-muted-foreground"
              >
                Loading checkout details...
              </div>
            ) : activeStep === 3 && shippingForm ? (
              <StripePaymentForm shippingForm={shippingForm} />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-sm text-muted-foreground">
                Please fill in the shipping form to continue.
              </div>
            )}
          </div>

          {activeStep === 1 ? (
            <div className="flex justify-start">
              <Button href="/products" variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Continue curating
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="w-full xl:sticky xl:top-31 xl:w-[400px]">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Summary
                </p>
                <h3 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.025em] text-foreground">
                  Order summary
                </h3>
              </div>
              <ShoppingBag className="size-5 text-muted-foreground" />
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">
                  {formatUsdFromCents(subtotalCents)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-foreground">
                  Complimentary
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Taxes</span>
                <span className="font-medium text-foreground">
                  Calculated at checkout
                </span>
              </div>
              <div className="h-px w-full bg-border" />
              <div className="flex items-end justify-between">
                <span className="text-base font-medium text-foreground">
                  Total
                </span>
                <span className="font-serif text-3xl font-semibold text-foreground">
                  {formatUsdFromCents(subtotalCents)}
                </span>
              </div>
            </div>

            {activeStep === 1 ? (
              <Button
                type="button"
                disabled={!hasItems}
                onClick={() =>
                  router.push("/cart?step=2" as Route, { scroll: false })
                }
                className="mt-8 w-full gap-2"
              >
                Continue to checkout
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : activeStep === 2 ? (
              <Button
                type="button"
                variant="outline"
                className="mt-8 w-full gap-2"
                onClick={() =>
                  router.push("/cart?step=1" as Route, { scroll: false })
                }
              >
                <ArrowLeft className="h-4 w-4" />
                Back to cart
              </Button>
            ) : activeStep === 3 ? (
              <Button
                type="button"
                variant="outline"
                className="mt-8 w-full gap-2"
                onClick={() =>
                  router.push("/cart?step=2" as Route, { scroll: false })
                }
              >
                <ArrowLeft className="h-4 w-4" />
                Edit shipping
              </Button>
            ) : null}

            <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs">Secure, encrypted transaction</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-background">
          <div className="size-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
        </div>
      }
    >
      <CartContent />
    </Suspense>
  );
}
