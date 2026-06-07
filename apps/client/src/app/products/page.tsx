import type { Metadata } from "next";
import { Suspense } from "react";
import ProductList from "@/components/ProductList";
import ProductListSkeleton from "@/components/ProductListSkeleton";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse the live Commerce catalog with category, search, and price filters.",
};

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
    <div className="pb-10 pt-2">
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
