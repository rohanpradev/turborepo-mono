import type { Metadata } from "next";
import ProductList from "@/components/ProductList";

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
    <ProductList
      category={category}
      search={search}
      sort={sort}
      page={page}
      params="products"
    />
  );
};

export default ProductsPage;
