"use client";

import { formatUsdFromCents } from "@repo/types";
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
import { Suspense, useState } from "react";
import ShippingForm from "@/components/ShippingForm";
import StripePaymentForm from "@/components/StripePaymentForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useCartStore from "@/stores/cartStore";
import type { ShippingFormInputs } from "@/types";

const steps = [
  { id: 1, title: "Cart" },
  { id: 2, title: "Shipping" },
  { id: 3, title: "Payment" },
];

const CartContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [shippingForm, setShippingForm] = useState<ShippingFormInputs>();

  const activeStep = parseInt(searchParams.get("step") || "1", 10);

  const { cart, removeFromCart, setCartItemQuantity } = useCartStore();
  const subtotalCents = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const hasItems = cart.length > 0;

  return (
    <div className="space-y-8 pb-10 pt-4">
      <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-[#f7f3ea] shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div className="space-y-5">
            <Badge
              variant="outline"
              className="w-fit border-black/10 bg-white/80 px-3 py-1 uppercase tracking-[0.24em] text-gray-600"
            >
              Precision Curator
            </Badge>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                Cart
              </h1>
              <p className="max-w-2xl text-base leading-7 text-gray-600">
                Review your curated selections, adjust quantities, and move into
                checkout when you are ready.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`rounded-2xl border px-4 py-3 shadow-sm ${
                  step.id === activeStep
                    ? "border-gray-950 bg-gray-950 text-white"
                    : "border-black/10 bg-white/80 text-gray-600"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.24em] opacity-70">
                  Step {step.id}
                </p>
                <p className="mt-1 text-sm font-medium">{step.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:gap-12">
        <div className="w-full flex-1 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-400">
                Shopping Cart
              </p>
              <h2 className="text-[2.5rem] font-semibold tracking-tight text-gray-950 sm:text-[3.5rem]">
                Review items
              </h2>
            </div>
            <Badge variant="outline" className="bg-white/80 text-gray-700">
              {cart.length} item{cart.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="flex items-center gap-3 rounded-[1.5rem] border border-black/5 bg-white/80 p-2 shadow-sm backdrop-blur">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex flex-1 items-center gap-3 rounded-[1rem] px-4 py-3 ${
                  step.id === activeStep
                    ? "bg-gray-950 text-white"
                    : "text-gray-500"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    step.id === activeStep
                      ? "bg-white/10 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {step.id}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] opacity-75">
                    Step
                  </p>
                  <p className="text-sm font-medium">{step.title}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[1.75rem] border border-black/5 bg-white/80 p-5 shadow-sm md:p-6">
            {activeStep === 1 ? (
              hasItems ? (
                <div className="space-y-4">
                  {cart.map((item) => {
                    const imageUrl =
                      item.images[item.selectedColor] ??
                      Object.values(item.images)[0] ??
                      "/featured.png";

                    return (
                      <article
                        key={item.id + item.selectedSize + item.selectedColor}
                        className="group relative overflow-hidden rounded-[1.5rem] border border-black/5 bg-white p-4 shadow-[0_24px_48px_-28px_rgba(15,23,42,0.3)] transition hover:-translate-y-0.5"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50 opacity-0 transition group-hover:opacity-100" />
                        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-stretch">
                          <div className="relative overflow-hidden rounded-[1.25rem] bg-[#f3f0e8] sm:w-40">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                            <Image
                              src={imageUrl}
                              alt={item.name}
                              width={320}
                              height={320}
                              className="h-40 w-full object-contain p-4 transition duration-700 group-hover:scale-105 sm:h-full"
                              sizes="(min-width: 640px) 160px, 100vw"
                            />
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                                  {item.categorySlug}
                                </p>
                                <h3 className="truncate text-lg font-semibold tracking-tight text-gray-950">
                                  {item.name}
                                </h3>
                                <p className="mt-1 text-sm leading-6 text-gray-600">
                                  {item.shortDescription}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item)}
                                className="rounded-full border border-black/10 bg-white p-2 text-gray-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                aria-label="Remove item"
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
                              <div className="flex items-center rounded-full border border-black/10 bg-[#f7f7f4] p-1 shadow-sm">
                                <button
                                  type="button"
                                  aria-label="Decrease quantity"
                                  className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-white hover:text-gray-950"
                                  onClick={() =>
                                    setCartItemQuantity(item, item.quantity - 1)
                                  }
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="flex h-10 min-w-10 items-center justify-center px-3 text-sm font-semibold text-gray-950">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-white hover:text-gray-950"
                                  onClick={() =>
                                    setCartItemQuantity(item, item.quantity + 1)
                                  }
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="text-right">
                                <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                                  Line total
                                </p>
                                <p className="text-2xl font-semibold tracking-tight text-gray-950">
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
                <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 px-4 py-12 text-center text-sm text-gray-500">
                  Your cart is empty.
                </div>
              )
            ) : activeStep === 2 ? (
              <ShippingForm setShippingForm={setShippingForm} />
            ) : activeStep === 3 && shippingForm ? (
              <StripePaymentForm shippingForm={shippingForm} />
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 px-4 py-12 text-sm text-gray-500">
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

        <aside className="w-full xl:sticky xl:top-8 xl:w-[400px]">
          <div className="rounded-[1.75rem] border border-black/5 bg-white/90 p-6 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.3)] backdrop-blur">
            <div className="mb-6 h-1 w-full rounded-full bg-gradient-to-r from-gray-950 via-gray-700 to-gray-400" />
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-400">
                  Summary
                </p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
                  Order summary
                </h3>
              </div>
              <ShoppingBag className="h-6 w-6 text-gray-400" />
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-950">
                  {formatUsdFromCents(subtotalCents)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className="font-medium text-gray-950">Complimentary</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Taxes</span>
                <span className="font-medium text-gray-950">
                  Calculated at checkout
                </span>
              </div>
              <div className="h-px w-full bg-black/10" />
              <div className="flex items-end justify-between">
                <span className="text-base font-medium text-gray-950">
                  Total
                </span>
                <span className="text-3xl font-semibold tracking-tight text-gray-950">
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

            <div className="mt-6 flex items-center justify-center gap-2 text-gray-500">
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
        <div className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gray-800" />
        </div>
      }
    >
      <CartContent />
    </Suspense>
  );
}
