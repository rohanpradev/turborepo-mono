"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import useCartStore from "@/stores/cartStore";
import type { ProductType } from "@/types";

const ProductInteraction = ({
  product,
  selectedSize,
  selectedColor,
}: {
  product: ProductType;
  selectedSize: string;
  selectedColor: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();

  const { addToCart } = useCartStore();

  const handleTypeChange = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(type, value);
    startTransition(() => {
      const nextPath = `${pathname}?${params.toString()}`;
      router.push(nextPath as Route, { scroll: false });
    });
  };

  const handleQuantityChange = (type: "increment" | "decrement") => {
    if (type === "increment") {
      setQuantity((prev) => prev + 1);
    } else {
      if (quantity > 1) {
        setQuantity((prev) => prev - 1);
      }
    }
  };

  const handleAddToCart = () => {
    addToCart({
      ...product,
      quantity,
      selectedColor,
      selectedSize,
    });
    toast.success("Product added to cart");
  };

  const handleBuyNow = () => {
    addToCart({
      ...product,
      quantity,
      selectedColor,
      selectedSize,
    });
    router.push("/cart?step=2" as Route);
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-950">Size</span>
          <span className="text-xs uppercase tracking-[0.18em] text-gray-400">
            {selectedSize.toUpperCase()}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {product.sizes.map((size) => (
            <button
              type="button"
              className={`flex h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-medium transition ${
                selectedSize === size
                  ? "border-gray-950 bg-gray-950 text-white"
                  : "border-black/10 bg-white text-gray-700 hover:border-gray-400"
              }`}
              key={size}
              disabled={isPending}
              aria-pressed={selectedSize === size}
              onClick={() => handleTypeChange("size", size)}
            >
              {size.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-950">Color</span>
          <span className="text-xs uppercase tracking-[0.18em] text-gray-400">
            {selectedColor}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {product.colors.map((color) => (
            <button
              type="button"
              className={`rounded-full border p-1 transition ${
                selectedColor === color
                  ? "border-gray-950"
                  : "border-black/10 hover:border-gray-400"
              }`}
              key={color}
              disabled={isPending}
              aria-label={`Select ${color} color`}
              aria-pressed={selectedColor === color}
              onClick={() => handleTypeChange("color", color)}
            >
              <span
                className="block size-8 rounded-full border border-black/10"
                style={{ backgroundColor: color }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-sm font-medium text-gray-950">Quantity</span>
        <div className="inline-flex items-center rounded-full border border-black/10 bg-white p-1 shadow-sm">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 disabled:opacity-40"
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            onClick={() => handleQuantityChange("decrement")}
          >
            <Minus className="size-4" />
          </button>
          <span className="flex h-10 min-w-12 items-center justify-center px-3 text-sm font-semibold text-gray-950">
            {quantity}
          </span>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-gray-950"
            aria-label="Increase quantity"
            onClick={() => handleQuantityChange("increment")}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          onClick={handleAddToCart}
          className="w-full min-w-0"
          size="lg"
        >
          <Plus className="size-4" />
          Add to cart
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full min-w-0"
          onClick={handleBuyNow}
        >
          <ShoppingCart className="size-4" />
          Buy now
        </Button>
      </div>
    </div>
  );
};

export default ProductInteraction;
