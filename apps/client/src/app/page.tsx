import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import ProductList from "@/components/ProductList";
import ProductListSkeleton from "@/components/ProductListSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Commerce",
  description:
    "Shop curated apparel, denim, and footwear with a fast catalog and secure checkout.",
};

const getSingleParam = (value?: string | Array<string>) =>
  Array.isArray(value) ? value[0] : value;

const Homepage = async ({
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

  return (
    <div className="space-y-8 pb-8">
      <section className="relative min-h-[430px] overflow-hidden rounded-lg border border-black/10 bg-gray-950 text-white shadow-sm">
        <Image
          src="/featured.png"
          alt="Commerce product lineup featuring apparel and shoes"
          fill
          preload
          sizes="(min-width: 1280px) 80rem, 100vw"
          className="object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,13,20,0.92),rgba(8,13,20,0.58),rgba(8,13,20,0.1))]" />

        <div className="relative flex min-h-[430px] max-w-2xl flex-col justify-end gap-6 p-5 sm:p-8 lg:p-10">
          <Badge
            variant="outline"
            className="w-fit border-white/20 bg-white/10 px-3 py-1 uppercase tracking-[0.18em] text-white"
          >
            New season edit
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
              Commerce
            </h1>
            <p className="max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              Curated performance staples, denim, and footwear with clean
              details and sharp everyday utility.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/products" variant="light">
              Shop products
            </Button>
            <Button href="/cart" variant="glass">
              View cart
            </Button>
          </div>
          <div className="grid gap-2 text-sm text-white/80 sm:grid-cols-3">
            {["Secure checkout", "Complimentary shipping", "Fresh catalog"].map(
              (label) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 backdrop-blur"
                >
                  {label}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <Suspense
        fallback={<ProductListSkeleton itemCount={8} />}
        key={`${category ?? "all"}-${search ?? ""}-${sort ?? ""}`}
      >
        <ProductList
          category={category}
          search={search}
          sort={sort}
          params="homepage"
        />
      </Suspense>
    </div>
  );
};

export default Homepage;
