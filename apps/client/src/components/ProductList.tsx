import {
  getProductServiceServerUrl,
  listCategories,
  listProducts,
} from "@repo/api-client";
import type { CategoryRecord, ProductRecord } from "@repo/types";
import { ArrowLeft, ArrowRight, SearchX } from "lucide-react";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import Categories from "@/components/Categories";
import Filter from "@/components/Filter";
import NavigationFeedback from "@/components/NavigationFeedback";
import ProductCard from "@/components/ProductCard";
import RefreshButton from "@/components/RefreshButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildCatalogHref,
  HOME_PRODUCT_LIMIT,
  normalizeSearch,
  normalizeSort,
  PRODUCT_PAGE_SIZE,
} from "@/lib/catalog";

type ProductListProps = {
  category?: string;
  search?: string;
  sort?: string;
  page?: number;
  params: "homepage" | "products";
};

const liveCatalogFetchOptions = {
  cache: "no-store" as const,
};

const ProductList = async ({
  category,
  search,
  sort,
  page = 1,
  params,
}: ProductListProps) => {
  // Suspend before the RPC client can wrap a prerender cancellation as an API error.
  await io();
  let products: Array<ProductRecord> = [];
  let categories: Array<Pick<CategoryRecord, "name" | "slug">> = [];
  let pagination = {
    page,
    pageSize: params === "homepage" ? HOME_PRODUCT_LIMIT : PRODUCT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  let loadError: string | null = null;
  const normalizedSearch = normalizeSearch(search);
  const normalizedSort = normalizeSort(sort);
  const selectedCategory = category && category !== "all" ? category : "all";

  try {
    const baseUrl = getProductServiceServerUrl();
    const normalizedCategory =
      selectedCategory !== "all" ? selectedCategory : undefined;
    const [productsResponse, categoriesResponse] = await Promise.all([
      listProducts(
        baseUrl,
        {
          category: normalizedCategory,
          limit: params === "homepage" ? HOME_PRODUCT_LIMIT : PRODUCT_PAGE_SIZE,
          page: params === "products" ? page : undefined,
          search: normalizedSearch,
          sort: normalizedSort,
        },
        liveCatalogFetchOptions,
      ),
      listCategories(baseUrl, liveCatalogFetchOptions),
    ]);

    products = productsResponse.data;
    pagination = productsResponse.meta;
    categories = categoriesResponse.data;
  } catch (error) {
    console.error(error);
    loadError = "Catalog is temporarily unavailable. Please try again soon.";
  }

  const viewAllHref = buildCatalogHref({
    category: selectedCategory,
    path: "/products",
    search: normalizedSearch,
    sort: normalizedSort,
  });

  const getPageHref = (nextPage: number) =>
    buildCatalogHref({
      category: selectedCategory,
      page: nextPage,
      path: "/products",
      search: normalizedSearch,
      sort: normalizedSort,
    });

  if (
    params === "products" &&
    !loadError &&
    pagination.page > pagination.totalPages
  ) {
    redirect(getPageHref(pagination.totalPages));
  }

  return (
    <section
      id="collection"
      aria-labelledby={`catalog-heading-${params}`}
      className="w-full scroll-mt-48 lg:scroll-mt-36 space-y-6"
    >
      <div
        className={
          params === "homepage"
            ? "flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6"
            : "flex items-center justify-between gap-5"
        }
      >
        <div className="space-y-3">
          <Badge
            variant="outline"
            className={
              params === "homepage" ? "bg-card text-muted-foreground" : "hidden"
            }
          >
            {params === "homepage" ? "Featured selection" : "Live catalog"}
          </Badge>
          <h2
            id={`catalog-heading-${params}`}
            className={
              params === "homepage"
                ? "max-w-2xl font-serif text-4xl font-normal tracking-[-0.04em] sm:text-5xl"
                : "sr-only"
            }
          >
            {params === "homepage"
              ? "A few current favorites."
              : "Explore the catalog"}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {params === "homepage"
              ? "Easy pieces with enough character to earn a place in the daily rotation."
              : loadError
                ? "The collection will be back shortly."
                : `${pagination.total} product${pagination.total === 1 ? "" : "s"}${normalizedSearch ? ` matching “${normalizedSearch}”` : " to make your own"}.`}
          </p>
        </div>
        {params === "homepage" ? (
          <Button
            href={viewAllHref}
            variant="outline"
            size="lg"
            className="bg-card"
          >
            View all products
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-center xl:justify-between">
        <Categories
          categories={categories}
          path={params === "homepage" ? "/" : "/products"}
          search={normalizedSearch}
          selectedCategory={selectedCategory}
          sort={normalizedSort}
        />
        {params === "products" && <Filter />}
      </div>
      {(selectedCategory !== "all" || normalizedSearch) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Selected:</span>
          {normalizedSearch ? (
            <Button
              size="sm"
              variant="secondary"
              scroll={false}
              href={buildCatalogHref({
                path: params === "homepage" ? "/" : "/products",
                category: selectedCategory,
                sort: normalizedSort,
              })}
              aria-label={`Remove search ${normalizedSearch}`}
            >
              “{normalizedSearch}” ×
            </Button>
          ) : null}
          {selectedCategory !== "all" ? (
            <Button
              size="sm"
              variant="secondary"
              scroll={false}
              href={buildCatalogHref({
                path: params === "homepage" ? "/" : "/products",
                search: normalizedSearch,
                sort: normalizedSort,
              })}
              aria-label="Remove category filter"
            >
              {categories.find((category) => category.slug === selectedCategory)
                ?.name ?? selectedCategory}{" "}
              ×
            </Button>
          ) : null}
          <Button
            href={params === "homepage" ? "/" : "/products"}
            variant="link"
            size="sm"
            scroll={false}
          >
            Clear all
          </Button>
        </div>
      )}

      {loadError ? (
        <div
          role="status"
          className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground shadow-sm"
        >
          <h3 className="text-lg font-semibold text-foreground">
            A short pause in the collection
          </h3>
          <p className="mb-5 mt-2">{loadError}</p>
          <RefreshButton label="Try again" />
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              eager={params === "products" && index === 0}
              product={product}
            />
          ))}
        </div>
      ) : (
        <div
          role="status"
          className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center shadow-sm"
        >
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-6" aria-hidden="true" />
          </span>
          <h3 className="mt-5 font-serif text-3xl tracking-tight">
            A fresh start?
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            {normalizedSearch
              ? `We couldn’t find anything for “${normalizedSearch}”. Try a different word or explore the full collection.`
              : "There are no pieces in this selection yet. Explore another category to find your next favorite."}
          </p>
          {(selectedCategory !== "all" ||
            normalizedSearch ||
            (normalizedSort && normalizedSort !== "newest")) && (
            <Button
              href={params === "homepage" ? "/" : "/products"}
              variant="outline"
              className="mt-4"
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {params === "products" && !loadError && pagination.totalPages > 1 ? (
        <nav
          aria-label="Product pagination"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6"
        >
          <p className="text-sm text-muted-foreground">
            Page{" "}
            <span className="font-semibold text-foreground">
              {pagination.page}
            </span>{" "}
            of {pagination.totalPages} | {pagination.total} products
          </p>
          <div className="flex items-center gap-2">
            {pagination.hasPreviousPage ? (
              <Button href={getPageHref(pagination.page - 1)} variant="outline">
                <NavigationFeedback>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Previous
                </NavigationFeedback>
              </Button>
            ) : null}
            {pagination.hasNextPage ? (
              <Button href={getPageHref(pagination.page + 1)}>
                <NavigationFeedback>
                  Next
                  <ArrowRight className="size-4" aria-hidden="true" />
                </NavigationFeedback>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </section>
  );
};

export default ProductList;
