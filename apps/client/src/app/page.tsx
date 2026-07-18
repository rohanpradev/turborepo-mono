import { ArrowRight, PackageCheck, RotateCcw, ShieldCheck } from "lucide-react";
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
    "Shop a considered edit of everyday apparel, denim, and footwear with fast dispatch and secure checkout.",
  title: "Objects for everyday life",
});

const getSingleParam = (value?: string | Array<string>) =>
  Array.isArray(value) ? value[0] : value;

const servicePromises = [
  {
    description: "Protected payment with clear order status.",
    icon: ShieldCheck,
    title: "Secure checkout",
  },
  {
    description: "In-stock pieces leave quickly and reliably.",
    icon: PackageCheck,
    title: "Fast dispatch",
  },
  {
    description: "A straightforward path when it is not quite right.",
    icon: RotateCcw,
    title: "Easy returns",
  },
] as const;

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
    <div className="space-y-14 pb-8 sm:space-y-18">
      <section
        aria-labelledby="hero-heading"
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div className="grid lg:grid-cols-[0.88fr_1.12fr]">
          <div className="flex min-h-[32rem] flex-col justify-between border-b border-border px-6 py-7 sm:px-9 sm:py-9 lg:min-h-[39rem] lg:border-b-0 lg:border-r lg:px-12 lg:py-11">
            <div className="flex items-center justify-between gap-4">
              <Badge
                variant="outline"
                className="bg-background px-3 py-1 text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground"
              >
                New collection
              </Badge>
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground">
                Edition 01 — 2026
              </span>
            </div>

            <div className="max-w-xl space-y-8 py-14 lg:py-10">
              <div className="space-y-5">
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-primary">
                  The everyday, edited
                </p>
                <h1
                  id="hero-heading"
                  className="max-w-[9ch] font-serif text-[clamp(3.5rem,7vw,6.75rem)] font-semibold leading-[0.9] tracking-[-0.055em] text-foreground"
                >
                  Good things for real life.
                </h1>
                <p className="max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                  A concise collection of useful, well-made pieces selected for
                  comfort, character, and repeat wear.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button href="/products" size="lg">
                  Shop the collection
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  href="/products?sort=newest"
                  variant="outline"
                  size="lg"
                >
                  New arrivals
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-border pt-5 text-[0.6875rem] text-muted-foreground">
              <span>01 / Apparel</span>
              <span>02 / Denim</span>
              <span>03 / Footwear</span>
            </div>
          </div>

          <div className="relative min-h-[35rem] overflow-hidden bg-[#e9e5de] p-3 sm:p-4 lg:min-h-[39rem]">
            <div className="grid h-full min-h-[32rem] grid-cols-[1.18fr_0.82fr] grid-rows-[1fr_auto] gap-3 lg:min-h-[36.5rem]">
              <figure className="group relative row-span-2 overflow-hidden rounded-xl bg-[#f4f1eb]">
                <Image
                  src="/products/5o.png"
                  alt="Vibrant orange everyday hoodie"
                  fill
                  preload
                  quality={85}
                  sizes="(min-width: 1024px) 32vw, 60vw"
                  className="object-contain p-3 transition-transform duration-700 group-hover:scale-[1.02] sm:p-6"
                />
                <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/88 px-3 py-2.5 text-xs font-semibold text-stone-800 backdrop-blur sm:inset-x-4 sm:bottom-4 sm:px-4">
                  <span>Essential hoodie / Ember</span>
                  <span className="font-mono text-[0.625rem] text-stone-500">
                    01
                  </span>
                </figcaption>
              </figure>

              <figure className="group relative min-h-0 overflow-hidden rounded-xl bg-[#f8f7f4]">
                <Image
                  src="/products/7g.png"
                  alt="Lightweight grey everyday sneaker"
                  fill
                  quality={85}
                  sizes="(min-width: 1024px) 18vw, 35vw"
                  className="object-contain p-2 transition-transform duration-700 group-hover:scale-[1.03] sm:p-4"
                />
                <figcaption className="sr-only">
                  Everyday footwear in a soft neutral palette
                </figcaption>
              </figure>

              <div className="flex min-h-40 flex-col justify-between rounded-xl bg-primary p-4 text-primary-foreground sm:min-h-48 sm:p-5">
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-primary-foreground/60">
                  Our standard
                </span>
                <p className="font-serif text-xl leading-[1.05] tracking-[-0.025em] sm:text-2xl">
                  Less noise. Better choices.
                </p>
                <div className="flex items-center gap-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground/70">
                  Eight current pieces
                  <span
                    className="h-px flex-1 bg-primary-foreground/25"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Store service promises"
        className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3"
      >
        {servicePromises.map((item) => (
          <div
            key={item.title}
            className="flex gap-4 border-b border-border p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:p-6"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
              <item.icon className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {item.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        ))}
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
