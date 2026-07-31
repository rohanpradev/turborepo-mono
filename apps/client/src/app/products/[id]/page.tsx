import {
  ApiClientError,
  getProduct,
  getProductServiceServerUrl,
} from "@repo/api-client";
import { formatUsdFromCents } from "@repo/types";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import ProductInteraction from "@/components/ProductInteraction";
import { Badge } from "@/components/ui/badge";
import {
  getColorSwatchStyle,
  getPrimaryProductImage,
  isExternalProductImage,
} from "@/lib/catalog";
import { getSingleSearchParam } from "@/lib/search-params";

const getProductId = (value: string) => {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const liveCatalogFetchOptions = {
  cache: "no-store" as const,
};

const getClientAppUrl = () => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_CLIENT_APP_URL ??
        process.env.CLIENT_APP_URL ??
        "http://localhost:3002",
    );
  } catch {
    return new URL("http://localhost:3002");
  }
};

const toAbsoluteUrl = (pathOrUrl: string) => {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    return new URL(pathOrUrl, getClientAppUrl()).toString();
  }
};

const toJsonLd = (value: unknown) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");

const loadProduct = cache(async (id: number) => {
  try {
    const response = await getProduct(
      getProductServiceServerUrl(),
      id,
      liveCatalogFetchOptions,
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    throw error;
  }
});

export const generateMetadata = async ({
  params,
}: PageProps<"/products/[id]">): Promise<Metadata> => {
  const { id } = await params;
  const productId = getProductId(id);
  const product = productId ? await loadProduct(productId) : null;
  const primaryImage = product ? getPrimaryProductImage(product) : undefined;

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
                  url: toAbsoluteUrl(primaryImage),
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
}: PageProps<"/products/[id]">) => {
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

  const requestedSize = getSingleSearchParam(resolvedSearchParams.size);
  const requestedColor = getSingleSearchParam(resolvedSearchParams.color);
  const selectedSize =
    product.sizes.find((size) => size === requestedSize) ??
    product.sizes[0] ??
    "";
  const selectedColor =
    product.colors.find((color) => color === requestedColor) ??
    product.colors[0] ??
    "";
  const selectedImage = getPrimaryProductImage(product, selectedColor);
  const imageOptions = product.colors
    .map((color) => ({
      color,
      src: product.images[color],
    }))
    .filter(
      (option): option is { color: string; src: string } =>
        typeof option.src === "string" && option.src.length > 0,
    );
  const productUrl = toAbsoluteUrl(`/products/${product.id}`);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    brand: {
      "@type": "Brand",
      name: "Common Goods",
    },
    category: product.categorySlug,
    description: product.description,
    image: imageOptions.length
      ? imageOptions.map((option) => toAbsoluteUrl(option.src))
      : [toAbsoluteUrl(selectedImage)],
    name: product.name,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      price: (product.price / 100).toFixed(2),
      priceCurrency: "USD",
      url: productUrl,
    },
    sku: String(product.id),
    url: productUrl,
  };

  return (
    <div className="min-w-0 pb-12 pt-2">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(productJsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="mb-5 text-xs text-muted-foreground"
      >
        <Link
          href="/products"
          className="rounded-sm hover:text-foreground hover:underline hover:underline-offset-4"
        >
          Collection
        </Link>
        <span className="px-2" aria-hidden="true">
          /
        </span>
        <span className="text-foreground">{product.name}</span>
      </nav>
      <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <section className="min-w-0 space-y-4">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-[#efebe4]">
            <Image
              src={selectedImage}
              alt={product.name}
              fill
              unoptimized={isExternalProductImage(selectedImage)}
              preload
              decoding="async"
              quality={85}
              className="object-contain p-7 drop-shadow-[0_28px_30px_rgba(15,23,42,0.18)] sm:p-10"
              sizes="(min-width: 1024px) 52vw, 100vw"
            />
          </div>

          {imageOptions.length > 1 ? (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {imageOptions.map((option) => (
                <Link
                  key={option.color}
                  href={`/products/${product.id}?color=${encodeURIComponent(option.color)}&size=${encodeURIComponent(selectedSize)}`}
                  prefetch={false}
                  className={`relative aspect-square overflow-hidden rounded-lg border bg-card transition hover:border-foreground/30 ${
                    selectedColor === option.color
                      ? "border-foreground"
                      : "border-border"
                  }`}
                  aria-label={`View ${option.color} ${product.name}`}
                >
                  <Image
                    src={option.src}
                    alt={`${product.name} in ${option.color}`}
                    fill
                    unoptimized={isExternalProductImage(option.src)}
                    quality={75}
                    sizes="8rem"
                    className="object-contain p-2 drop-shadow-[0_10px_14px_rgba(15,23,42,0.14)]"
                  />
                  <span
                    className="absolute bottom-2 right-2 size-4 rounded-full border border-black/15 shadow-sm"
                    style={getColorSwatchStyle(option.color)}
                  />
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-2xl border border-border bg-card p-6 sm:p-8 lg:sticky lg:top-31">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-background text-muted-foreground"
                >
                  {product.categorySlug}
                </Badge>
                <Badge variant="secondary">
                  {product.colors.length} colors
                </Badge>
              </div>
              <div className="space-y-3">
                <h1 className="font-serif text-4xl font-semibold leading-[0.95] tracking-[-0.045em] text-foreground sm:text-5xl xl:text-6xl">
                  {product.name}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  {product.description}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-end justify-between gap-4 border-y border-border py-5">
                <div>
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Price
                  </p>
                  <p className="break-words font-serif text-4xl font-semibold text-foreground">
                    {formatUsdFromCents(product.price)}
                  </p>
                </div>
                <div className="text-left text-xs leading-5 text-muted-foreground sm:text-right">
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

          <div className="mt-8 grid gap-2 border-t border-border pt-5 text-xs text-muted-foreground sm:grid-cols-3">
            {[
              "Free standard shipping",
              "Encrypted Stripe payment",
              "Easy order tracking",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-border bg-muted/55 px-3 py-2"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4 border-t border-border pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <Image
                src="/klarna.png"
                alt="Klarna"
                width={56}
                height={28}
                className="rounded-md border border-border bg-white"
              />
              <Image
                src="/cards.png"
                alt="Cards"
                width={56}
                height={28}
                className="rounded-md border border-border bg-white"
              />
              <Image
                src="/stripe.png"
                alt="Stripe"
                width={56}
                height={28}
                className="rounded-md border border-border bg-white"
              />
            </div>
            <p className="max-w-2xl text-xs leading-6 text-muted-foreground">
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
