import Image from "next/image";
import { Suspense } from "react";
import ProductList from "@/components/ProductList";
import ProductListSkeleton from "@/components/ProductListSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createStoreMetadata } from "@/lib/metadata";

export const metadata = createStoreMetadata({
  canonical: "/",
  description:
    "Shop curated apparel, denim, and footwear with a fast catalog and secure checkout.",
  title: "Home",
});

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
    <div className="space-y-14 pb-10">
      <section className="relative min-h-[500px] overflow-hidden rounded-[2rem] bg-stone-950 text-white shadow-[0_30px_80px_-35px_rgba(39,31,25,0.65)]">
        <Image
          src="/featured.png"
          alt="Common Goods product lineup featuring apparel and shoes"
          fill
          preload
          quality={85}
          sizes="(min-width: 1280px) 80rem, 100vw"
          className="object-cover object-[center_45%] opacity-80"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,24,21,0.96),rgba(28,24,21,0.66),rgba(28,24,21,0.08))]" />
        <div className="absolute -bottom-32 -right-24 size-96 rounded-full border border-white/15" />

        <div className="relative flex min-h-[500px] max-w-2xl flex-col justify-end gap-7 p-6 sm:p-10 lg:p-14">
          <Badge
            variant="outline"
            className="w-fit border-white/20 bg-white/10 px-3 py-1 uppercase tracking-[0.18em] text-white/90"
          >
            New season edit
          </Badge>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">
              Built for daily rotation
            </p>
            <h1 className="font-serif text-5xl font-semibold leading-[0.94] text-white sm:text-6xl lg:text-7xl">
              The art of the everyday.
            </h1>
            <p className="max-w-lg text-base leading-7 text-white/75 sm:text-lg">
              A considered edit of wardrobe staples designed to be worn often,
              kept longer, and enjoyed daily.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/products" variant="light">
              Shop products
            </Button>
            <Button href="/cart" variant="glass" prefetch={false}>
              View cart
            </Button>
          </div>
          <div className="grid gap-2 text-sm text-white/80 sm:grid-cols-3">
            {["Secure checkout", "Fast dispatch", "Easy returns"].map(
              (label) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur"
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
