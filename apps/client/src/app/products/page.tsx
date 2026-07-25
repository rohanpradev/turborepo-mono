import { Suspense } from "react";
import ProductList from "@/components/ProductList";
import ProductListSkeleton from "@/components/ProductListSkeleton";
import { createStoreMetadata } from "@/lib/metadata";

export const metadata = createStoreMetadata({
  canonical: "/products",
  title: "Products",
  description:
    "Browse the live Common Goods catalog with category, search, and price filters.",
});

const getSingleParam = (value?: string | Array<string>) =>
  Array.isArray(value) ? value[0] : value;

const getPageParam = (value?: string | Array<string>) => {
  const page = Number(getSingleParam(value));

  return Number.isInteger(page) && page > 0 ? page : 1;
};

const ProductsPage = async ({ searchParams }: PageProps<"/products">) => {
  const resolvedSearchParams = await searchParams;
  const category = getSingleParam(resolvedSearchParams.category);
  const search = getSingleParam(resolvedSearchParams.search);
  const sort = getSingleParam(resolvedSearchParams.sort);
  const page = getPageParam(resolvedSearchParams.page);

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
      <Suspense
        fallback={<ProductListSkeleton itemCount={12} />}
        key={`${category ?? "all"}-${search ?? ""}-${sort ?? ""}-${page}`}
      >
        <ProductList
          category={category}
          search={search}
          sort={sort}
          page={page}
          params="products"
        />
      </Suspense>
    </div>
  );
};

export default ProductsPage;
