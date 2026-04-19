import {
  getProductServiceServerUrl,
  listCategories,
  listProducts,
} from "@repo/api-client";
import type { CategoryRecord, ProductRecord, ProductSort } from "@repo/types";
import type { Route } from "next";
import Link from "next/link";
import Categories from "@/components/Categories";
import Filter from "@/components/Filter";
import ProductCard from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";

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
    <section className="w-full space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
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
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-gray-700 underline decoration-gray-300 underline-offset-4"
          >
            View all products
          </Link>
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
    </section>
  );
};

export default ProductList;
