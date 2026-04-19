import Image from "next/image";
import ProductList from "@/components/ProductList";

const getSingleParam = (value?: string | Array<string>) =>
  Array.isArray(value) ? value[0] : value;

const Homepage = async ({
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
      <div className="relative aspect-[3/1] mb-12">
        <Image
          src="/featured.png"
          alt="Featured Product"
          fill
          priority
          sizes="(min-width: 1280px) 72rem, 100vw"
        />
      </div>
      <ProductList
        category={category}
        search={search}
        sort={sort}
        params="homepage"
      />
    </div>
  );
};

export default Homepage;
