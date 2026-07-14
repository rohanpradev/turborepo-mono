"use client";

import { formatUsdFromCents } from "@repo/types";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ProductCardActions from "@/components/ProductCardActions";
import { Badge } from "@/components/ui/badge";
import { getPrimaryProductImage } from "@/lib/catalog";
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
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-900/10 bg-[#fffdf9] shadow-[0_12px_30px_-24px_rgba(39,31,25,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_-32px_rgba(39,31,25,0.52)]">
      <Link href={`/products/${product.id}` as Route} className="block">
        <div className="relative aspect-[4/4.25] overflow-hidden bg-[#f0eee8]">
          <div className="absolute inset-x-[18%] bottom-[9%] h-4 rounded-full bg-black/10 blur-md transition duration-700 group-hover:bg-black/15" />
          <Image
            src={previewImage}
            alt={product.name}
            fill
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            quality={85}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            sizes="(min-width: 1536px) 18rem, (min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
          />
          <div className="absolute left-3 right-3 top-3 flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="bg-white/90 text-stone-950 shadow-sm"
            >
              New
            </Badge>
            <Badge
              variant="outline"
              className="hidden bg-white/80 text-gray-700 min-[380px]:inline-flex"
            >
              Ships fast
            </Badge>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="space-y-1">
          <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <h3 className="line-clamp-2 font-serif text-lg font-semibold leading-6 text-stone-950">
              {product.name}
            </h3>
            <p className="max-w-24 break-words text-right text-sm font-semibold text-stone-950">
              {formatUsdFromCents(product.price)}
            </p>
          </div>
          <p className="line-clamp-2 min-h-12 text-sm leading-6 text-stone-600">
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
