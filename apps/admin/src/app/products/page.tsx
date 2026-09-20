import { getProductServiceUrl } from "@repo/api-client";
import {
  catalogQuery,
  catalogQueryString,
  formatUsdFromCents,
} from "@repo/types";
import { ArrowLeft, ArrowRight, ExternalLink, Search } from "lucide-react";
import type { Metadata, Route } from "next";
import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import CatalogManager from "@/components/CatalogManager";
import RefreshButton from "@/components/RefreshButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadCatalogSnapshot } from "@/lib/admin-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Products",
  description:
    "Search your catalog, manage product details, and organize collections.",
};

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const query = catalogQuery(await searchParams);
  const { categories, products, pagination } = await loadCatalogSnapshot(query);
  const pageHref = (page: number) =>
    `/products?${catalogQueryString({ ...query, page })}` as Route;
  if (pagination.page > pagination.totalPages)
    redirect(pageHref(pagination.totalPages));
  const filtered = Boolean(query.search || query.category);
  const average = products.length
    ? Math.round(
        products.reduce((sum, product) => sum + product.price, 0) /
          products.length,
      )
    : 0;
  const metrics = [
    {
      label: filtered ? "Matching products" : "Total products",
      value: pagination.total.toLocaleString(),
      detail: filtered
        ? "Across all matching pages"
        : "Across the full catalog",
    },
    {
      label: "Categories",
      value: categories.length.toLocaleString(),
      detail: "Collections available to shoppers",
    },
    {
      label: "On this page",
      value: products.length.toLocaleString(),
      detail: `Page ${pagination.page} of ${pagination.totalPages}`,
    },
    {
      label: "Page average price",
      value: products.length ? formatUsdFromCents(average) : "—",
      detail: "Based on the products shown below",
    },
  ];

  return (
    <section className="min-w-0 space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Badge variant="outline">Store management</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Your catalog, in order.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Find a product, refine its details, and keep your collections ready
            for the next customer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RefreshButton />
          <Button asChild variant="outline">
            <a
              href={new URL(
                "/products",
                process.env.CLIENT_APP_URL ?? "http://localhost:3002",
              ).toString()}
            >
              View storefront{" "}
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          >
            <p className="text-xs font-semibold text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-3 break-words text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
              {metric.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {metric.detail}
            </p>
          </article>
        ))}
      </div>

      <section
        aria-label="Catalog filters"
        className="rounded-2xl border bg-card p-4 sm:p-5"
      >
        <Form
          action="/products"
          className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]"
        >
          <div className="space-y-2">
            <label htmlFor="catalog-search" className="text-xs font-semibold">
              Search products
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                key={query.search ?? ""}
                id="catalog-search"
                type="search"
                name="search"
                maxLength={200}
                placeholder="Name or description…"
                defaultValue={query.search}
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="catalog-category" className="text-xs font-semibold">
              Category
            </label>
            <select
              key={query.category ?? "all"}
              id="catalog-category"
              name="category"
              defaultValue={query.category ?? "all"}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="catalog-sort" className="text-xs font-semibold">
              Sort by
            </label>
            <select
              key={query.sort}
              id="catalog-sort"
              name="sort"
              defaultValue={query.sort}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="asc">Price: low to high</option>
              <option value="desc">Price: high to low</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" className="h-10">
              Apply filters
            </Button>
            {filtered || query.sort !== "newest" ? (
              <Button asChild variant="ghost">
                <Link href="/products">Reset</Link>
              </Button>
            ) : null}
          </div>
        </Form>
      </section>

      <CatalogManager
        initialCategories={categories}
        initialProducts={products}
        productServiceUrl={getProductServiceUrl()}
      >
        <nav
          aria-label="Catalog pagination"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 text-sm"
        >
          <p className="text-muted-foreground">
            {pagination.total === 0
              ? "No matching products"
              : `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} products`}
          </p>
          <div className="flex gap-2">
            {pagination.hasPreviousPage ? (
              <Button asChild variant="outline">
                <Link href={pageHref(pagination.page - 1)}>
                  <ArrowLeft aria-hidden="true" />
                  Previous
                </Link>
              </Button>
            ) : null}
            {pagination.hasNextPage ? (
              <Button asChild variant="outline">
                <Link href={pageHref(pagination.page + 1)}>
                  Next
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </div>
        </nav>
      </CatalogManager>
    </section>
  );
}
