"use client";

import { MAX_CART_ITEM_QUANTITY } from "@repo/types";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getColorSwatchStyle } from "@/lib/catalog";
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

  const addToCart = useCartStore((state) => state.addToCart);

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
      setQuantity((prev) => Math.min(prev + 1, MAX_CART_ITEM_QUANTITY));
    } else {
      setQuantity((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleAddToCart = () => {
    addToCart({
      ...product,
      quantity,
      selectedColor,
      selectedSize,
    });
    toast.success(`${product.name} added to your bag`, {
      description: `${selectedColor} · ${selectedSize.toUpperCase()}`,
    });
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
          <span className="text-sm font-semibold text-foreground">Size</span>
          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {selectedSize.toUpperCase()}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {product.sizes.map((size) => (
            <button
              type="button"
              className={`flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium transition ${
                selectedSize === size
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
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
          <span className="text-sm font-semibold text-foreground">Color</span>
          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {selectedColor}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {product.colors.map((color) => (
            <button
              type="button"
              className={`cursor-pointer rounded-full border p-1 transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 ${
                selectedColor === color
                  ? "border-foreground"
                  : "border-border hover:border-foreground/30"
              }`}
              key={color}
              disabled={isPending}
              aria-label={`Select ${color} color`}
              aria-pressed={selectedColor === color}
              onClick={() => handleTypeChange("color", color)}
            >
              <span
                className="block size-8 rounded-full border border-black/10"
                style={getColorSwatchStyle(color)}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-sm font-semibold text-foreground">Quantity</span>
        <div className="inline-flex items-center rounded-lg border border-border bg-card p-1 shadow-xs">
          <button
            type="button"
            className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            onClick={() => handleQuantityChange("decrement")}
          >
            <Minus className="size-4" />
          </button>
          <span className="flex h-9 min-w-12 items-center justify-center px-3 text-sm font-semibold text-foreground">
            {quantity}
          </span>
          <button
            type="button"
            className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Increase quantity"
            disabled={quantity >= MAX_CART_ITEM_QUANTITY}
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
