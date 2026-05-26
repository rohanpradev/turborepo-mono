import { getProduct, getProductServiceServerUrl } from "@repo/api-client";
import { formatUsdFromCents } from "@repo/types";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import ProductInteraction from "@/components/ProductInteraction";
import { Badge } from "@/components/ui/badge";

const getSingleParam = (value?: string | Array<string>) =>
  Array.isArray(value) ? value[0] : value;

const getProductId = (value: string) => {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const liveCatalogFetchOptions = {
  cache: "no-store" as const,
};

const loadProduct = cache(async (id: number) => {
  try {
    const response = await getProduct(
      getProductServiceServerUrl(),
      id,
      liveCatalogFetchOptions,
    );
    return response.data;
  } catch {
    return null;
  }
});

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> => {
  const { id } = await params;
  const productId = getProductId(id);
  const product = productId ? await loadProduct(productId) : null;
  const primaryImage = product
    ? (product.images[product.colors[0] ?? ""] ??
      Object.values(product.images)[0] ??
      "/featured.png")
    : undefined;

  return {
    title: product?.name ?? "Product unavailable",
    description:
      product?.shortDescription ?? "The requested product is not available.",
    alternates: product ? { canonical: `/products/${product.id}` } : undefined,
    openGraph: product
      ? {
          title: product.name,
          description: product.shortDescription,
          url: `/products/${product.id}`,
          images: primaryImage
            ? [
                {
                  url: primaryImage,
                  alt: product.name,
                },
              ]
            : undefined,
        }
      : undefined,
  };
};

const ProductPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    color?: string | Array<string>;
    size?: string | Array<string>;
  }>;
}) => {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const productId = getProductId(id);

  if (!productId) {
    notFound();
  }

  const product = await loadProduct(productId);

  if (!product) {
    notFound();
  }

  const requestedSize = getSingleParam(resolvedSearchParams.size);
  const requestedColor = getSingleParam(resolvedSearchParams.color);
  const selectedSize =
    product.sizes.find((size) => size === requestedSize) ??
    product.sizes[0] ??
    "";
  const selectedColor =
    product.colors.find((color) => color === requestedColor) ??
    product.colors[0] ??
    "";
  const selectedImage =
    product.images[selectedColor] ??
    Object.values(product.images)[0] ??
    "/featured.png";
  const imageOptions = product.colors
    .map((color) => ({
      color,
      src: product.images[color],
    }))
    .filter(
      (option): option is { color: string; src: string } =>
        typeof option.src === "string" && option.src.length > 0,
    );

  return (
    <div className="min-w-0 pb-12 pt-4">
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-12 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <section className="min-w-0 space-y-4">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] border border-black/5 bg-[#f4f1eb] shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-black/[0.04]" />
            <Image
              src={selectedImage}
              alt={product.name}
              fill
              preload
              className="object-contain p-8"
              sizes="(min-width: 1024px) 52vw, 100vw"
            />
          </div>

          {imageOptions.length > 1 ? (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {imageOptions.map((option) => (
                <Link
                  key={option.color}
                  href={`/products/${product.id}?color=${encodeURIComponent(option.color)}&size=${encodeURIComponent(selectedSize)}`}
                  className={`relative aspect-square overflow-hidden rounded-2xl border bg-white transition hover:border-gray-400 ${
                    selectedColor === option.color
                      ? "border-gray-950"
                      : "border-black/10"
                  }`}
                  aria-label={`View ${option.color} ${product.name}`}
                >
                  <Image
                    src={option.src}
                    alt={`${product.name} in ${option.color}`}
                    fill
                    sizes="8rem"
                    className="object-contain p-2"
                  />
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-[1.5rem] border border-black/5 bg-white/85 p-5 shadow-sm backdrop-blur sm:rounded-[1.75rem] sm:p-7">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-white text-gray-700">
                  {product.categorySlug}
                </Badge>
                <Badge variant="secondary">
                  {product.colors.length} colors
                </Badge>
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl xl:text-5xl">
                  {product.name}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-gray-600">
                  {product.description}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-end justify-between gap-4 border-y border-black/5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-gray-400">
                    Price
                  </p>
                  <p className="break-words text-3xl font-semibold tracking-tight text-gray-950">
                    {formatUsdFromCents(product.price)}
                  </p>
                </div>
                <div className="text-left text-xs leading-5 text-gray-500 sm:text-right">
                  <p>Secure checkout</p>
                  <p>Stripe-backed payment</p>
                </div>
              </div>
            </div>

            <ProductInteraction
              product={product}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
            />
          </div>

          <div className="mt-8 space-y-4 border-t border-black/5 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <Image
                src="/klarna.png"
                alt="Klarna"
                width={56}
                height={28}
                className="rounded-md border border-black/5 bg-white"
              />
              <Image
                src="/cards.png"
                alt="Cards"
                width={56}
                height={28}
                className="rounded-md border border-black/5 bg-white"
              />
              <Image
                src="/stripe.png"
                alt="Stripe"
                width={56}
                height={28}
                className="rounded-md border border-black/5 bg-white"
              />
            </div>
            <p className="max-w-2xl text-xs leading-6 text-gray-500">
              By continuing to checkout, you agree to the terms and authorize
              the selected payment method to be charged for the order total.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductPage;
