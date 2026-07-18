"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import useCartStore from "@/stores/cartStore";

const ShoppingCartIcon = () => {
  const cart = useCartStore((state) => state.cart);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <Link
      href="/cart"
      prefetch={false}
      aria-label={
        hasHydrated
          ? `View shopping bag with ${itemCount} item${itemCount === 1 ? "" : "s"}`
          : "View shopping bag"
      }
      className="relative grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
    >
      <ShoppingCart className="size-4.5" aria-hidden="true" />
      {hasHydrated && itemCount > 0 ? (
        <span
          aria-live="polite"
          className="absolute right-0.5 top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold text-primary-foreground ring-2 ring-card"
        >
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
};

export default ShoppingCartIcon;
