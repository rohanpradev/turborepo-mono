"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import useCartStore from "@/stores/cartStore";

const ShoppingCartIcon = () => {
  const { cart, hasHydrated } = useCartStore();

  if (!hasHydrated) return null;
  return (
    <Link href="/cart" className="relative rounded-full p-1">
      <ShoppingCart className="w-4 h-4 text-gray-600" />
      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-medium text-gray-600">
        {cart.reduce((acc, item) => acc + item.quantity, 0)}
      </span>
    </Link>
  );
};

export default ShoppingCartIcon;
