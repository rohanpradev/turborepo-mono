import { getProductServiceUrl } from "@repo/api-client";
import { formatUsdFromCents } from "@repo/types";
import type { Metadata } from "next";
import Image from "next/image";
import CatalogManager from "@/components/CatalogManager";
import {
  getStorefrontAssetUrl,
  getStorefrontProductUrl,
  loadCatalogSnapshot,
} from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Live catalog operations view with category mix, storefront links, and current product inventory.",
};

const ProductsPage = async () => {
  const { categories, products } = await loadCatalogSnapshot();
  const productServiceUrl = getProductServiceUrl();
  const highestPriceCents = products.reduce(
    (highestPrice, product) => Math.max(highestPrice, product.price),
    0,
  );
  const averagePriceCents =
    products.length > 0
      ? Math.round(
          products.reduce((total, product) => total + product.price, 0) /
            products.length,
        )
      : 0;

  return (
    <section className="min-w-0 space-y-6 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Product Catalog
            </p>
            <h1 className="max-w-4xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Live catalog view backed by product-service
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              This view is driven by the real product-service catalog, using the
              same seeded storefront assets and prices the shopper sees.
            </p>
          </div>
          <a
            href={new URL(
              "/products",
              process.env.CLIENT_APP_URL ?? "http://localhost:3002",
            ).toString()}
            rel="noreferrer"
            target="_blank"
            className="shrink-0 text-sm underline"
          >
            Open storefront catalog
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Total Products
          </p>
          <p className="mt-3 text-3xl font-semibold">{products.length}</p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Categories
          </p>
          <p className="mt-3 text-3xl font-semibold">{categories.length}</p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Avg Catalog Price
          </p>
          <p className="mt-3 break-words text-2xl font-semibold sm:text-3xl">
            {formatUsdFromCents(averagePriceCents)}
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Highest Price
          </p>
          <p className="mt-3 break-words text-2xl font-semibold sm:text-3xl">
            {formatUsdFromCents(highestPriceCents)}
          </p>
        </article>
      </div>

      <CatalogManager
        initialCategories={categories}
        initialProducts={products}
        productServiceUrl={productServiceUrl}
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.5fr]">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Category Mix</h2>
            <p className="text-sm text-muted-foreground">
              Product volume by catalog category.
            </p>
          </div>

          <div className="space-y-3">
            {categories.map((category) => (
              <article
                key={category.slug}
                className="rounded-xl border border-dashed p-4"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{category.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {category.slug}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                    {category.productCount ?? 0} products
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Catalog Inventory</h2>
            <p className="text-sm text-muted-foreground">
              Latest products available in the storefront, with direct links to
              the shopper-facing page.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <article
                key={product.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-dashed"
              >
                <div className="relative aspect-[4/3] bg-[linear-gradient(145deg,var(--background)_0%,var(--muted)_100%)]">
                  <div className="absolute inset-x-10 bottom-7 h-4 rounded-full bg-black/10 blur-md dark:bg-white/10" />
                  <Image
                    src={getStorefrontAssetUrl(
                      Object.values(product.images)[0] ?? "/logo.svg",
                    )}
                    alt={product.name}
                    width={640}
                    height={480}
                    quality={75}
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="h-full w-full object-contain p-4 drop-shadow-[0_16px_20px_rgba(15,23,42,0.16)]"
                  />
                </div>
                <div className="space-y-4 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-medium">{product.name}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {product.shortDescription}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatUsdFromCents(product.price)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border px-2.5 py-1">
                      {product.categorySlug}
                    </span>
                    <span className="rounded-full border px-2.5 py-1">
                      {product.colors.length} colors
                    </span>
                    <span className="rounded-full border px-2.5 py-1">
                      {product.sizes.length} sizes
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {product.description}
                    </p>
                    <a
                      href={getStorefrontProductUrl(product.id)}
                      className="shrink-0 text-sm underline"
                      rel="noreferrer"
                      target="_blank"
                    >
                      View
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};

export default ProductsPage;
