import {
  getProductServiceServerUrl,
  listCategories,
  listProducts,
} from "@repo/api-client";
import type { CategoryRecord, ProductRecord, ProductSort } from "@repo/types";
import type { Route } from "next";
import Link from "next/link";
import Categories from "./Categories";
import Filter from "./Filter";
import ProductCard from "./ProductCard";

type ProductListProps = {
  category?: string;
  search?: string;
  sort?: string;
  params: "homepage" | "products";
};

const ProductList = async ({
  category,
  search,
  sort,
  params,
}: ProductListProps) => {
  let products: Array<ProductRecord> = [];
  let categories: Array<Pick<CategoryRecord, "name" | "slug">> = [];
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
      listProducts(baseUrl, {
        category: normalizedCategory,
        limit: params === "homepage" ? 8 : 24,
        search: normalizedSearch,
        sort: normalizedSort,
      }),
      listCategories(baseUrl),
    ]);

    products = productsResponse.data;
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

  return (
    <div className="w-full">
      <Categories categories={categories} />
      {params === "products" && <Filter />}

      {loadError ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
          {loadError}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-12">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
          No products matched the current filter.
        </div>
      )}

      {params === "homepage" && (
        <Link
          href={viewAllHref}
          className="flex justify-end mt-4 underline text-sm text-gray-500"
        >
          View all products
        </Link>
      )}
    </div>
  );
};

export default ProductList;
