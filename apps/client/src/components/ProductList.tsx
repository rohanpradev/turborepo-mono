import {
  getProductServiceServerUrl,
  listCategories,
  listProducts,
} from "@repo/api-client";
import type { CategoryRecord, ProductRecord, ProductSort } from "@repo/types";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Route } from "next";
import Categories from "@/components/Categories";
import Filter from "@/components/Filter";
import ProductCard from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  let products: Array<ProductRecord> = [];
  let categories: Array<Pick<CategoryRecord, "name" | "slug">> = [];
  let pagination = {
    page,
    pageSize: params === "homepage" ? 8 : 24,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  let loadError: string | null = null;
  const normalizedSearch = search?.trim() || undefined;
  const normalizedSort =
    sort && ["asc", "desc", "oldest", "newest"].includes(sort)
      ? (sort as ProductSort)
      : undefined;

  try {
    const baseUrl = getProductServiceServerUrl();
    const normalizedCategory =
      category && category !== "all" ? category : undefined;
    const [productsResponse, categoriesResponse] = await Promise.all([
      listProducts(
        baseUrl,
        {
          category: normalizedCategory,
          limit: params === "homepage" ? 8 : 24,
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
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load products right now.";
  }

  const viewAllParams = new URLSearchParams();

  if (category) {
    viewAllParams.set("category", category);
  }

  if (normalizedSearch) {
    viewAllParams.set("search", normalizedSearch);
  }

  if (normalizedSort && normalizedSort !== "newest") {
    viewAllParams.set("sort", normalizedSort);
  }

  const viewAllHref = viewAllParams.size
    ? (`/products?${viewAllParams.toString()}` as Route)
    : ("/products" as Route);

  const getPageHref = (nextPage: number) => {
    const pageParams = new URLSearchParams();

    if (category) {
      pageParams.set("category", category);
    }

    if (normalizedSearch) {
      pageParams.set("search", normalizedSearch);
    }

    if (normalizedSort && normalizedSort !== "newest") {
      pageParams.set("sort", normalizedSort);
    }

    if (nextPage > 1) {
      pageParams.set("page", String(nextPage));
    }

    return pageParams.size
      ? (`/products?${pageParams.toString()}` as Route)
      : ("/products" as Route);
  };

  return (
    <section className="w-full space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black/5 pb-5">
        <div className="space-y-1">
          <Badge variant="outline" className="bg-white/80 text-gray-700">
            Curated selection
          </Badge>
          <h2 className="text-xl font-semibold tracking-tight text-gray-950 sm:text-2xl">
            {params === "homepage"
              ? "Featured products"
              : "Explore the catalog"}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-gray-600">
            A clean catalog with sharper product photography, clearer groupings,
            and a simpler path to checkout.
          </p>
        </div>
        {params === "homepage" ? (
          <Button
            href={viewAllHref}
            variant="outline"
            size="lg"
            className="bg-white/80"
          >
            View all products
          </Button>
        ) : null}
      </div>

      <Categories categories={categories} />
      {params === "products" && <Filter />}

      {loadError ? (
        <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 px-4 py-10 text-center text-sm text-gray-500 shadow-sm">
          {loadError}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/80 px-4 py-10 text-center text-sm text-gray-500 shadow-sm">
          No products matched the current filter.
        </div>
      )}

      {params === "products" && !loadError && pagination.totalPages > 1 ? (
        <nav
          aria-label="Product pagination"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-5"
        >
          <p className="text-sm text-gray-600">
            Page{" "}
            <span className="font-medium text-gray-950">{pagination.page}</span>{" "}
            of {pagination.totalPages} · {pagination.total} products
          </p>
          <div className="flex items-center gap-2">
            {pagination.hasPreviousPage ? (
              <Button href={getPageHref(pagination.page - 1)} variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            ) : null}
            {pagination.hasNextPage ? (
              <Button href={getPageHref(pagination.page + 1)}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </section>
  );
};

export default ProductList;
