import {
  ArrowDown,
  ArrowRight,
  PackageCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import detailsImage from "@/assets/considered-details.webp";
import campaignImage from "@/assets/everyday-campaign.webp";
import CollectionCategories from "@/components/CollectionCategories";
import ProductList from "@/components/ProductList";
import ProductListSkeleton from "@/components/ProductListSkeleton";
import { Button } from "@/components/ui/button";
import { createStoreMetadata } from "@/lib/metadata";
import { getSingleSearchParam } from "@/lib/search-params";

export const metadata = createStoreMetadata({
  canonical: "/",
  description:
    "Discover your everyday favorites. A considered collection of apparel, denim, and footwear, with secure checkout and live order updates.",
  title: "Everyday, a little better",
});

const servicePromises = [
  {
    icon: Sparkles,
    title: "A considered collection",
    description: "Less searching. More finding your favorites.",
  },
  {
    icon: ShieldCheck,
    title: "Shop with confidence",
    description: "Secure payments from bag to checkout.",
  },
  {
    icon: PackageCheck,
    title: "Stay in the loop",
    description: "Follow your order, every step of the way.",
  },
] as const;

async function HomepageCatalog({
  searchParams,
}: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;
  return (
    <ProductList
      category={getSingleSearchParam(params.category)}
      search={getSingleSearchParam(params.search)}
      sort={getSingleSearchParam(params.sort)}
      params="homepage"
    />
  );
}

export default function Homepage({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-16 pb-4 sm:space-y-24">
      <section
        aria-labelledby="hero-heading"
        className="overflow-hidden bg-[#ece8df]"
      >
        <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative flex flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12 xl:px-16">
            <p className="flex items-center gap-3 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-foreground/70">
              <span
                className="size-1.5 rounded-full bg-primary"
                aria-hidden="true"
              />
              The everyday collection · No. 01
            </p>
            <div className="py-7 sm:py-14 lg:py-16">
              <h1
                id="hero-heading"
                className="max-w-[9ch] font-serif text-[clamp(3.8rem,6.7vw,7rem)] font-normal leading-[0.94] tracking-[-0.065em]"
              >
                Everyday,
                <br />a little{" "}
                <em className="font-normal text-primary">better.</em>
              </h1>
              <p className="mt-7 max-w-[29ch] text-sm leading-7 text-foreground/70 sm:text-base">
                Easy layers. Favorite fits. Good things to reach for, again and
                again.
              </p>
              <Button
                href="/products"
                size="lg"
                className="mt-8 h-12 gap-8 rounded-none px-6"
              >
                Find your everyday{" "}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <a
              href="#categories-heading"
              className="hidden min-h-11 w-fit items-center gap-3 sm:flex text-[0.625rem] font-semibold uppercase tracking-[0.17em] text-foreground/65 hover:text-foreground"
            >
              <ArrowDown className="size-4" aria-hidden="true" /> A few good
              places to start
            </a>
          </div>
          <figure className="relative min-h-[25rem] sm:min-h-[32rem] lg:min-h-[42rem]">
            <Image
              src={campaignImage}
              alt="Two people in relaxed cream knitwear and olive layers beside sunlit stone architecture"
              fill
              preload
              placeholder="blur"
              quality={85}
              sizes="(min-width: 1536px) 810px, (min-width: 1024px) 55vw, 100vw"
              className="object-cover object-[60%_center]"
            />
            <div
              className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent"
              aria-hidden="true"
            />
            <figcaption className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-5 text-white sm:inset-x-8 sm:bottom-8">
              <div>
                <p className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-white/85">
                  A slower kind of style
                </p>
                <p className="mt-2 font-serif text-3xl tracking-tight">
                  Made for the in-between.
                </p>
              </div>
              <span className="hidden font-mono text-xs text-white/80 sm:block">
                01 / 2026
              </span>
            </figcaption>
          </figure>
        </div>
        <div className="flex flex-wrap justify-between gap-x-8 gap-y-3 border-t border-foreground/10 px-6 py-4 text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-foreground/65 sm:px-10 lg:px-12">
          <span>Comfort comes naturally.</span>
          <span>Apparel · Denim · Footwear</span>
          <span className="hidden lg:block">
            Common Goods, uncommon everyday.
          </span>
        </div>
      </section>

      <CollectionCategories />

      <Suspense fallback={<ProductListSkeleton itemCount={8} />}>
        <HomepageCatalog searchParams={searchParams} />
      </Suspense>

      <section
        aria-labelledby="philosophy-heading"
        className="grid overflow-hidden bg-[#e8e9df] md:grid-cols-2"
      >
        <div className="relative min-h-80 md:min-h-[34rem]">
          <Image
            src={detailsImage}
            alt="Cream knitwear, indigo denim and canvas sneakers in warm afternoon light"
            fill
            placeholder="blur"
            quality={85}
            sizes="(min-width: 1536px) 704px, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center px-7 py-12 sm:px-12 lg:px-18">
          <span className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-foreground/65">
            The Common Goods point of view
          </span>
          <h2
            id="philosophy-heading"
            className="mt-6 max-w-[12ch] font-serif text-5xl font-normal leading-[1.02] tracking-[-0.05em] lg:text-6xl"
          >
            Fewer things.
            <br />
            <em className="font-normal">More meaning.</em>
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-7 text-foreground/70">
            The pieces you love most rarely shout. They fit your day, feel like
            you, and make getting dressed a little easier. That’s the idea
            behind our edit.
          </p>
          <Button
            href="/products?sort=newest"
            variant="link"
            className="mt-7 h-12 w-fit justify-start rounded-none border-b border-foreground/40 px-0"
          >
            Discover the latest edit{" "}
            <ArrowRight className="ml-4 size-4" aria-hidden="true" />
          </Button>
        </div>
      </section>

      <section
        aria-label="Shopping with Common Goods"
        className="grid gap-8 border-y border-border py-8 sm:grid-cols-3 sm:gap-6 sm:py-10"
      >
        {servicePromises.map((item) => (
          <div
            key={item.title}
            className="flex gap-4 sm:flex-col lg:flex-row lg:gap-5"
          >
            <item.icon
              className="mt-1 size-5 shrink-0 text-primary"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div>
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
