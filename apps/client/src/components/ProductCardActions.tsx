"use client";

import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getColorSwatchStyle } from "@/lib/catalog";
import useCartStore from "@/stores/cartStore";
import type { ProductType } from "@/types";

type ProductCardActionsProps = {
  onSelectedColorChange: (color: string) => void;
  product: ProductType;
  selectedColor: string;
};

const ProductCardActions = ({
  onSelectedColorChange,
  product,
  selectedColor,
}: ProductCardActionsProps) => {
  const defaultSize = product.sizes[0] ?? "";
  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const addToCart = useCartStore((state) => state.addToCart);

  const handleAddToCart = () => {
    addToCart({
      ...product,
      quantity: 1,
      selectedColor,
      selectedSize,
    });
    toast.success("Added to cart");
  };

  return (
    <div className="mt-auto space-y-3">
      <div className="grid gap-3 text-xs">
        <label
          htmlFor={`size-${product.id}`}
          className="font-medium uppercase tracking-[0.14em] text-gray-500"
        >
          Size
        </label>
        <Select
          name="size"
          id={`size-${product.id}`}
          value={selectedSize}
          onChange={(event) => setSelectedSize(event.target.value)}
        >
          {product.sizes.map((size) => (
            <option key={size} value={size}>
              {size.toUpperCase()}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
          Color
        </span>
        <div className="flex min-h-9 flex-wrap gap-2">
          {product.colors.slice(0, 6).map((color) => (
            <button
              type="button"
              key={color}
              aria-label={`Select ${color} color`}
              aria-pressed={selectedColor === color}
              onClick={() => onSelectedColorChange(color)}
              className={`grid size-9 place-items-center rounded-full border transition ${
                selectedColor === color
                  ? "border-gray-950 bg-gray-950"
                  : "border-black/10 bg-white hover:border-gray-400"
              }`}
            >
              <span
                className="size-5 rounded-full border border-black/15"
                style={getColorSwatchStyle(color)}
              />
            </button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        onClick={handleAddToCart}
        disabled={!selectedSize || !selectedColor}
        className="w-full"
      >
        <ShoppingCart className="size-4" />
        Quick add
      </Button>
    </div>
  );
};

export default ProductCardActions;
