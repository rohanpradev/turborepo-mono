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
      className="relative grid size-10 place-items-center rounded-full text-stone-700 transition hover:bg-stone-100"
    >
      <ShoppingCart className="size-4" />
      {hasHydrated ? (
        <span
          aria-live="polite"
          className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b94e28] px-1 text-[10px] font-medium text-white"
        >
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
};

export default ShoppingCartIcon;
