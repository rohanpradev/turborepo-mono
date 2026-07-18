"use client";

import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
    toast.success(`${product.name} added to your bag`, {
      description: `${selectedColor} · ${selectedSize.toUpperCase()}`,
    });
  };

  return (
    <div className="mt-auto space-y-3 border-t border-border pt-4">
      <div className="grid gap-2 text-xs">
        <label
          htmlFor={`size-${product.id}`}
          className="font-bold uppercase tracking-[0.14em] text-muted-foreground"
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

      <fieldset className="space-y-2">
        <legend className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Color
        </legend>
        <div className="flex min-h-8 flex-wrap gap-1.5">
          {product.colors.slice(0, 6).map((color) => (
            <button
              type="button"
              key={color}
              aria-label={`Select ${color} color`}
              aria-pressed={selectedColor === color}
              onClick={() => onSelectedColorChange(color)}
              title={color}
              className={`grid size-9 cursor-pointer place-items-center rounded-full border transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:ring-offset-2 ${
                selectedColor === color
                  ? "border-foreground bg-foreground shadow-sm"
                  : "border-border bg-card hover:border-stone-400"
              }`}
            >
              <span
                className="size-4.5 rounded-full border border-black/15"
                style={getColorSwatchStyle(color)}
              />
            </button>
          ))}
        </div>
      </fieldset>

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
