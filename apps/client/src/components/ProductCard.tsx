"use client";

import { formatUsdFromCents } from "@repo/types";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ProductCardActions from "@/components/ProductCardActions";
import { Badge } from "@/components/ui/badge";
import { getPrimaryProductImage, isExternalProductImage } from "@/lib/catalog";
import type { ProductType } from "@/types";

const ProductCard = ({
  eager = false,
  product,
}: {
  eager?: boolean;
  product: ProductType;
}) => {
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? "");
  const previewImage = getPrimaryProductImage(product, selectedColor);

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-[border-color,box-shadow] duration-300 hover:border-foreground/20 hover:shadow-[0_18px_45px_-34px_rgba(28,25,23,0.6)]">
      <Link
        href={`/products/${product.id}` as Route}
        className="block rounded-t-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/45"
      >
        <div className="relative aspect-[4/4.6] overflow-hidden bg-[#f0ede7]">
          <Image
            src={previewImage}
            alt={product.name}
            fill
            unoptimized={isExternalProductImage(previewImage)}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            quality={85}
            className="object-contain p-3 transition-transform duration-700 group-hover:scale-[1.025] sm:p-4"
            sizes="(min-width: 1536px) 18rem, (min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
          />
          <div className="absolute left-3 right-3 top-3 flex flex-wrap justify-between gap-2">
            <Badge
              variant="outline"
              className="border-white/70 bg-white/85 text-[0.625rem] uppercase tracking-[0.12em] text-stone-700 backdrop-blur"
            >
              {product.categorySlug}
            </Badge>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-1">
          <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <h3 className="line-clamp-2 text-base font-semibold leading-6 tracking-[-0.01em] text-foreground">
              <Link
                href={`/products/${product.id}` as Route}
                className="inline-flex min-h-6 items-center rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
              >
                {product.name}
              </Link>
            </h3>
            <p className="max-w-24 break-words text-right text-sm font-bold text-foreground">
              {formatUsdFromCents(product.price)}
            </p>
          </div>
          <p className="line-clamp-2 min-h-12 text-sm leading-6 text-muted-foreground">
            {product.shortDescription}
          </p>
        </div>

        <ProductCardActions
          product={product}
          selectedColor={selectedColor}
          onSelectedColorChange={setSelectedColor}
        />
      </div>
    </article>
  );
};

export default ProductCard;
