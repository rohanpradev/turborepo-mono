import type { Metadata } from "next";
import ProductList from "@/components/ProductList";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse the live TrendLama catalog with category, search, and price filters.",
};

const getSingleParam = (value?: string | Array<string>) =>
  Array.isArray(value) ? value[0] : value;

const ProductsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string | Array<string>;
    search?: string | Array<string>;
    sort?: string | Array<string>;
  }>;
}) => {
  const resolvedSearchParams = await searchParams;
  const category = getSingleParam(resolvedSearchParams.category);
  const search = getSingleParam(resolvedSearchParams.search);
  const sort = getSingleParam(resolvedSearchParams.sort);

  return (
    <div className="">
      <ProductList
        category={category}
        search={search}
        sort={sort}
        params="products"
      />
    </div>
  );
};

export default ProductsPage;
