import { formatUsdFromCents } from "@repo/types";
import type { Metadata } from "next";
import Image from "next/image";
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
    <section className="space-y-6 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Product Catalog
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
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
            className="text-sm underline"
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
          <p className="mt-3 text-3xl font-semibold">
            {formatUsdFromCents(averagePriceCents)}
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Highest Price
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {formatUsdFromCents(highestPriceCents)}
          </p>
        </article>
      </div>

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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.slug}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
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
                className="overflow-hidden rounded-2xl border border-dashed"
              >
                <div className="aspect-[4/3] bg-muted">
                  <Image
                    src={getStorefrontAssetUrl(
                      Object.values(product.images)[0] ?? "/logo.svg",
                    )}
                    alt={product.name}
                    width={640}
                    height={480}
                    unoptimized
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.shortDescription}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
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

                  <div className="flex items-center justify-between gap-3">
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
