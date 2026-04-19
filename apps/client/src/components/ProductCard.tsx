"use client";

import { formatUsdFromCents } from "@repo/types";
import { ShoppingCart } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useCartStore from "@/stores/cartStore";
import type { ProductType } from "@/types";

const ProductCard = ({ product }: { product: ProductType }) => {
  const defaultSize = product.sizes[0] ?? "";
  const defaultColor = product.colors[0] ?? "";
  const [productTypes, setProductTypes] = useState({
    size: defaultSize,
    color: defaultColor,
  });
  const previewImage =
    product.images[productTypes.color] ??
    Object.values(product.images)[0] ??
    "/featured.png";

  const { addToCart } = useCartStore();

  const handleProductType = ({
    type,
    value,
  }: {
    type: "size" | "color";
    value: string;
  }) => {
    setProductTypes((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  const handleAddToCart = () => {
    addToCart({
      ...product,
      quantity: 1,
      selectedSize: productTypes.size,
      selectedColor: productTypes.color,
    });
    toast.success("Product added to cart");
  };

  return (
    <div className="group overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)]">
      <Link href={`/products/${product.id}` as Route} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f3f0e8]">
          <Image
            src={previewImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(min-width: 1536px) 18rem, (min-width: 1280px) 22rem, (min-width: 640px) 50vw, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-white/90 text-gray-900">
              New season
            </Badge>
            <Badge variant="outline" className="bg-white/75 text-gray-700">
              Ready to ship
            </Badge>
          </div>
        </div>
      </Link>

      <div className="flex flex-col gap-4 p-5">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold tracking-tight text-gray-950">
              {product.name}
            </h3>
            <p className="whitespace-nowrap text-sm font-medium text-gray-950">
              {formatUsdFromCents(product.price)}
            </p>
          </div>
          <p className="text-sm leading-6 text-gray-600">
            {product.shortDescription}
          </p>
        </div>

        <div className="grid gap-3 text-xs">
          <div className="space-y-2">
            <span className="uppercase tracking-[0.18em] text-gray-400">
              Size
            </span>
            <select
              name="size"
              id="size"
              className="h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/20 focus:ring-2 focus:ring-black/5"
              onChange={(e) =>
                handleProductType({ type: "size", value: e.target.value })
              }
            >
              {product.sizes.map((size) => (
                <option key={size} value={size}>
                  {size.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <span className="uppercase tracking-[0.18em] text-gray-400">
              Color
            </span>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((color) => (
                <button
                  type="button"
                  key={color}
                  aria-label={`Select ${color} color`}
                  aria-pressed={productTypes.color === color}
                  onClick={() =>
                    handleProductType({ type: "color", value: color })
                  }
                  className={`flex items-center gap-2 rounded-full border px-3 py-2 transition ${
                    productTypes.color === color
                      ? "border-gray-900 bg-gray-950 text-white"
                      : "border-black/10 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                  <span className="capitalize">{color}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleAddToCart}
          disabled={!productTypes.size || !productTypes.color}
          className="w-full gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          Add to cart
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
