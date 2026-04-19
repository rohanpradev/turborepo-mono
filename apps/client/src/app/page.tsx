import Image from "next/image";
import ProductList from "@/components/ProductList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const spotlight = [
    {
      alt: "Transit Zip Hoodie on a warm ivory panel",
      bg: "from-stone-100 via-white to-stone-50",
      eyebrow: "Featured",
      name: "Transit Zip Hoodie",
      price: "Premium layer",
      src: "/products/2gr.png",
    },
    {
      alt: "Monochrome Runner on a cool slate panel",
      bg: "from-slate-100 via-white to-slate-50",
      eyebrow: "Footwear",
      name: "Monochrome Runner",
      price: "Everyday movement",
      src: "/products/6w.png",
    },
    {
      alt: "Studio Cotton Tee on a soft green panel",
      bg: "from-emerald-50 via-white to-emerald-100",
      eyebrow: "Tops",
      name: "Studio Cotton Tee",
      price: "Soft foundation",
      src: "/products/4w.png",
    },
  ] as const;

  return (
    <div className="space-y-10 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-[#f7f3ea] shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        <div className="grid gap-8 p-6 lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
          <div className="flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <Badge
                variant="outline"
                className="w-fit border-black/10 bg-white/80 px-3 py-1 uppercase tracking-[0.24em] text-gray-600"
              >
                Precision Curator
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl lg:text-[3.75rem]">
                  The Winter Edit.
                </h1>
                <p className="max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
                  Curated essentials for a cleaner storefront. Better product
                  composition, softer backgrounds, and a checkout path that
                  feels intentional from browsing to payment success.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button href="/products">Shop the collection</Button>
              <Button href="/cart" variant="outline">
                View cart
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                "Editorial product imagery",
                "Fast checkout flow",
                "Premium catalog layout",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-gray-700 shadow-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="relative overflow-hidden rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-sm sm:row-span-2">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${spotlight[0].bg}`}
              />
              <div className="relative flex h-full min-h-[380px] flex-col justify-between">
                <div className="flex items-center justify-between gap-3">
                  <Badge
                    variant="secondary"
                    className="bg-white/90 px-3 py-1 uppercase tracking-[0.18em] text-gray-600"
                  >
                    {spotlight[0].eyebrow}
                  </Badge>
                  <span className="text-xs text-gray-500">Featured</span>
                </div>
                <div className="relative mx-auto w-full max-w-xs flex-1">
                  <Image
                    src={spotlight[0].src}
                    alt={spotlight[0].alt}
                    fill
                    priority
                    sizes="(min-width: 1280px) 28rem, 100vw"
                    className="object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-950">
                      {spotlight[0].name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {spotlight[0].price}
                    </p>
                  </div>
                </div>
              </div>
            </article>

            {spotlight.slice(1).map((pick) => (
              <article
                key={pick.name}
                className="relative overflow-hidden rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-sm"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${pick.bg}`}
                />
                <div className="relative flex min-h-[180px] flex-col justify-between gap-3">
                  <Badge
                    variant="secondary"
                    className="w-fit bg-white/90 px-3 py-1 uppercase tracking-[0.18em] text-gray-600"
                  >
                    {pick.eyebrow}
                  </Badge>
                  <div className="relative mx-auto h-40 w-full">
                    <Image
                      src={pick.src}
                      alt={pick.alt}
                      fill
                      sizes="(min-width: 768px) 20rem, 50vw"
                      className="object-contain drop-shadow-xl"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-950">
                      {pick.name}
                    </p>
                    <p className="text-xs text-gray-500">{pick.price}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
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
