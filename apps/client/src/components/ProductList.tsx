import {
  getProductServiceServerUrl,
  listCategories,
  listProducts,
} from "@repo/api-client";
import type { CategoryRecord, ProductRecord } from "@repo/types";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Categories from "@/components/Categories";
import Filter from "@/components/Filter";
import ProductCard from "@/components/ProductCard";
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

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-900/10 pb-6">
        <div className="space-y-1">
          <Badge variant="outline" className="bg-white text-gray-700">
            {params === "homepage" ? "Featured selection" : "Live catalog"}
          </Badge>
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            {params === "homepage"
              ? "Featured products"
              : "Explore the catalog"}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">
            {params === "homepage"
              ? "Fresh picks across apparel, denim, and footwear."
              : `${pagination.total} product${pagination.total === 1 ? "" : "s"} across every current category.`}
          </p>
        </div>
        {params === "homepage" ? (
          <Button
            href={viewAllHref}
            variant="outline"
            size="lg"
            className="bg-white"
          >
            View all products
          </Button>
        ) : null}
      </div>

      <Categories
        categories={categories}
        path={params === "homepage" ? "/" : "/products"}
        search={normalizedSearch}
        selectedCategory={selectedCategory}
        sort={normalizedSort}
      />
      {params === "products" && <Filter />}

      {loadError ? (
        <div className="rounded-lg border border-dashed border-black/15 bg-white px-4 py-10 text-center text-sm text-gray-500 shadow-sm">
          {loadError}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              eager={params === "products" && index < 4}
              product={product}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-black/15 bg-white px-4 py-10 text-center text-sm text-gray-500 shadow-sm">
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
            of {pagination.totalPages} | {pagination.total} products
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
