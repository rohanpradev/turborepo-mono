import Image from "next/image";
import ProductList from "@/components/ProductList";

const Homepage = async ({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) => {
  const category = (await searchParams).category;
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
      <ProductList category={category} params="homepage" />
    </div>
  );
};

export default Homepage;
