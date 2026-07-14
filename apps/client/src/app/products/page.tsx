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

const ProductsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string | Array<string>;
    search?: string | Array<string>;
    sort?: string | Array<string>;
    page?: string | Array<string>;
  }>;
}) => {
  const resolvedSearchParams = await searchParams;
  const category = getSingleParam(resolvedSearchParams.category);
  const search = getSingleParam(resolvedSearchParams.search);
  const sort = getSingleParam(resolvedSearchParams.sort);
  const page = getPageParam(resolvedSearchParams.page);

  return (
    <div className="space-y-8 pb-10 pt-2">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#e7ded0] p-6 sm:p-10">
        <div className="absolute -right-16 -top-20 size-64 rounded-full border border-stone-900/10" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
          Live catalog
        </p>
        <h1 className="relative mt-3 font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
          Explore all products
        </h1>
        <p className="relative mt-3 max-w-2xl text-sm leading-6 text-stone-700 sm:text-base">
          Search, sort, and filter the latest apparel, denim, and footwear.
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
