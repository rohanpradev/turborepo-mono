import { Suspense } from "react";
import ProductList from "@/components/ProductList";
import ProductListSkeleton from "@/components/ProductListSkeleton";
import { createStoreMetadata } from "@/lib/metadata";
import {
  getPositiveIntegerSearchParam,
  getSingleSearchParam,
} from "@/lib/search-params";

export const metadata = createStoreMetadata({
  canonical: "/products",
  title: "Products",
  description:
    "Browse the live Common Goods catalog with category, search, and price filters.",
});

const ProductsCatalog = async ({
  searchParams,
}: Pick<PageProps<"/products">, "searchParams">) => {
  const resolvedSearchParams = await searchParams;
  const category = getSingleSearchParam(resolvedSearchParams.category);
  const search = getSingleSearchParam(resolvedSearchParams.search);
  const sort = getSingleSearchParam(resolvedSearchParams.sort);
  const page = getPositiveIntegerSearchParam(resolvedSearchParams.page);

  return (
    <ProductList
      category={category}
      search={search}
      sort={sort}
      page={page}
      params="products"
    />
  );
};

const ProductsPage = ({ searchParams }: PageProps<"/products">) => {
  return (
    <div className="space-y-8 pb-10 pt-2">
      <header className="grid gap-8 rounded-2xl border border-border bg-card p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-end lg:p-11">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-primary">
            Collection / 2026
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-[0.9] tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl">
            The complete edit.
          </h1>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
          Search, sort, and filter current apparel, denim, and footwear. Each
          piece is selected for regular use and easy pairing.
        </p>
      </header>
      <Suspense fallback={<ProductListSkeleton itemCount={12} />}>
        <ProductsCatalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default ProductsPage;
