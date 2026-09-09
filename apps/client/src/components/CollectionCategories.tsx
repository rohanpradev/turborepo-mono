import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const collections = [
  {
    name: "Outerwear",
    description: "Layers to live in",
    slug: "outerwear",
    image: "/products/5o.png",
    color: "bg-[#eee4d8]",
  },
  {
    name: "Denim",
    description: "Your everyday foundation",
    slug: "denim",
    image: "/products/8b.png",
    color: "bg-[#e5e9ed]",
  },
  {
    name: "Shoes",
    description: "Go a little further",
    slug: "shoes",
    image: "/products/7g.png",
    color: "bg-[#e8e9df]",
  },
] as const;

export default function CollectionCategories() {
  return (
    <section aria-labelledby="categories-heading" className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-primary">
            Find your everyday
          </p>
          <h2
            id="categories-heading"
            className="mt-2 font-serif text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
          >
            Good from the ground up.
          </h2>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:block">
          Explore by category
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">
        {collections.map((collection) => (
          <Link
            key={collection.slug}
            href={`/products?category=${collection.slug}`}
            className={`group relative isolate flex min-h-40 items-end overflow-hidden rounded-xl p-5 sm:min-h-64 ${collection.color}`}
          >
            <div className="absolute inset-y-0 right-0 -z-10 w-1/2 sm:bottom-14 sm:w-3/4">
              <Image
                src={collection.image}
                alt=""
                fill
                sizes="(min-width: 640px) 25vw, 45vw"
                className="object-contain p-3 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex w-full items-end justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  {collection.name}
                </h3>
                <p className="mt-1 text-xs text-stone-600">
                  {collection.description}
                </p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/80 transition-colors group-hover:bg-white">
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
