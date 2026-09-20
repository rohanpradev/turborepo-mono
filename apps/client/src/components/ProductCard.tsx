"use client";

import { formatUsdFromCents } from "@repo/types";
import { ArrowUpRight, Plus } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ProductCardActions from "@/components/ProductCardActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getColorSwatchStyle,
  getPrimaryProductImage,
  isExternalProductImage,
} from "@/lib/catalog";
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
  const href = `/products/${product.id}` as Route;

  return (
    <article className="group flex h-full min-w-0 flex-col">
      <Link
        href={href}
        className="relative block overflow-hidden bg-[#eeece6] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
      >
        <div className="relative aspect-[4/5]">
          <Image
            src={previewImage}
            alt={product.name}
            fill
            unoptimized={isExternalProductImage(previewImage)}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            quality={85}
            className="object-contain p-2 mix-blend-multiply transition-transform duration-700 group-hover:scale-[1.04] sm:p-4"
            sizes="(min-width: 1536px) 336px, (min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
          />
        </div>
        <span className="absolute bottom-3 right-3 hidden size-9 place-items-center rounded-full bg-card/90 text-foreground transition-transform group-hover:-rotate-12 sm:grid">
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 px-1 pb-1 pt-3 sm:pt-4">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {product.categorySlug.replaceAll("-", " ")}
        </p>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 tracking-tight sm:text-base sm:leading-6">
            <Link
              href={href}
              className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
            >
              {product.name}
            </Link>
          </h3>
          <p className="shrink-0 text-sm font-semibold tabular-nums">
            {formatUsdFromCents(product.price)}
          </p>
        </div>
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {product.colors.slice(0, 5).map((color) => (
            <span
              key={color}
              aria-hidden="true"
              className="size-3 rounded-full border border-black/15"
              style={getColorSwatchStyle(color)}
            />
          ))}
          <span className="text-xs text-muted-foreground">
            {product.colors.length} color
            {product.colors.length === 1 ? "" : "s"}
          </span>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-auto h-11 w-full gap-2 rounded-none border-border bg-transparent px-2 text-xs hover:bg-card sm:text-sm"
              aria-label={`Choose options for ${product.name}`}
            >
              <Plus className="size-4" aria-hidden="true" />
              Choose options
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="pr-8 font-serif text-2xl leading-tight">
                {product.name}
              </DialogTitle>
              <DialogDescription>{product.shortDescription}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-4 rounded-xl bg-muted p-3">
              <div className="relative size-24 shrink-0">
                <Image
                  src={previewImage}
                  alt={`${product.name} in ${selectedColor}`}
                  fill
                  unoptimized={isExternalProductImage(previewImage)}
                  sizes="96px"
                  className="object-contain"
                />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {formatUsdFromCents(product.price)}
                </p>
                <Link
                  href={href}
                  className="mt-2 inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4"
                >
                  View full details
                </Link>
              </div>
            </div>
            <ProductCardActions
              product={product}
              selectedColor={selectedColor}
              onSelectedColorChange={setSelectedColor}
            />
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
};

export default ProductCard;
