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
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import useCartStore from "@/stores/cartStore";
import type { ProductType } from "@/types";

const ProductCard = ({ product }: { product: ProductType }) => {
  const defaultSize = product.sizes[0] ?? "";
  const defaultColor = product.colors[0] ?? "";
  const visibleColors = product.colors.slice(0, 4);
  const hiddenColorCount = Math.max(
    product.colors.length - visibleColors.length,
    0,
  );
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
    <Card className="group flex h-full min-h-[40rem] min-w-0 flex-col overflow-hidden rounded-[1.5rem] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)] sm:rounded-[1.75rem]">
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
          <div className="absolute left-3 right-3 top-3 flex flex-wrap gap-2 sm:left-4 sm:right-4 sm:top-4">
            <Badge variant="secondary" className="bg-white/90 text-gray-900">
              New season
            </Badge>
            <Badge
              variant="outline"
              className="hidden bg-white/75 text-gray-700 min-[380px]:inline-flex"
            >
              Ready to ship
            </Badge>
          </div>
        </div>
      </Link>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="space-y-1">
          <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <h3 className="line-clamp-2 text-base font-semibold leading-6 tracking-tight text-gray-950">
              {product.name}
            </h3>
            <p className="max-w-24 break-words text-right text-sm font-medium text-gray-950">
              {formatUsdFromCents(product.price)}
            </p>
          </div>
          <p className="line-clamp-2 min-h-12 text-sm leading-6 text-gray-600">
            {product.shortDescription}
          </p>
        </div>

        <div className="grid min-h-[10.75rem] content-start gap-3 text-xs">
          <div className="space-y-2">
            <label
              htmlFor={`size-${product.id}`}
              className="uppercase tracking-[0.18em] text-gray-400"
            >
              Size
            </label>
            <Select
              name="size"
              id={`size-${product.id}`}
              value={productTypes.size}
              onChange={(e) =>
                handleProductType({ type: "size", value: e.target.value })
              }
            >
              {product.sizes.map((size) => (
                <option key={size} value={size}>
                  {size.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <span className="uppercase tracking-[0.18em] text-gray-400">
              Color
            </span>
            <div className="grid min-h-20 grid-cols-2 content-start gap-2">
              {visibleColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  aria-label={`Select ${color} color`}
                  aria-pressed={productTypes.color === color}
                  onClick={() =>
                    handleProductType({ type: "color", value: color })
                  }
                  className={`flex h-9 min-w-0 items-center gap-2 rounded-full border px-3 transition ${
                    productTypes.color === color
                      ? "border-gray-900 bg-gray-950 text-white"
                      : "border-black/10 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate capitalize">{color}</span>
                </button>
              ))}
              {hiddenColorCount > 0 ? (
                <Link
                  href={`/products/${product.id}` as Route}
                  className="flex h-9 items-center justify-center rounded-full border border-dashed border-black/10 bg-gray-50 px-3 text-gray-500 transition hover:bg-gray-100"
                >
                  +{hiddenColorCount} more
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleAddToCart}
          disabled={!productTypes.size || !productTypes.color}
          className="mt-auto w-full gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          Add to cart
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
