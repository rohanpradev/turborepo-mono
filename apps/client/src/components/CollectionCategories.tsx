import { ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const collections = [
  {
    name: "The art of layering",
    label: "Outerwear",
    description: "An extra layer. A little more you.",
    slug: "outerwear",
    image: "/products/5o.png",
    color: "bg-[#eae3d9]",
    number: "01",
  },
  {
    name: "Your daily denim",
    label: "Denim",
    description: "Your everyday foundation.",
    slug: "denim",
    image: "/products/8b.png",
    color: "bg-[#e4e7e7]",
    number: "02",
  },
  {
    name: "A step in your direction",
    label: "Footwear",
    description: "For wherever the day takes you.",
    slug: "shoes",
    image: "/products/7g.png",
    color: "bg-[#e6e7de]",
    number: "03",
  },
] as const;

export default function CollectionCategories() {
  return (
    <section aria-labelledby="categories-heading" className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-primary">
            The building blocks
          </p>
          <h2
            id="categories-heading"
            className="mt-3 scroll-mt-48 font-serif text-4xl font-normal tracking-[-0.045em] sm:text-5xl"
          >
            Find your kind of everyday.
          </h2>
        </div>
        <Link
          href="/products"
          className="flex min-h-11 items-center gap-3 text-xs font-semibold underline-offset-4 hover:underline"
        >
          Explore the collection{" "}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-8 sm:grid-cols-3 sm:gap-5">
        {collections.map((collection) => (
          <Link
            key={collection.slug}
            href={`/products?category=${collection.slug}`}
            className="group block min-w-0"
          >
            <div
              className={`relative aspect-[5/4] overflow-hidden sm:aspect-[4/4.4] ${collection.color}`}
            >
              <span className="absolute left-5 top-5 z-10 font-mono text-[0.625rem] tracking-widest text-foreground/55">
                {collection.number} / {collection.label.toUpperCase()}
              </span>
              <Image
                src={collection.image}
                alt=""
                fill
                sizes="(min-width: 1536px) 456px, (min-width: 640px) 33vw, 100vw"
                className="object-contain px-10 pb-6 pt-12 mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute bottom-4 right-4 grid size-10 place-items-center rounded-full bg-background/90 transition-colors group-hover:bg-foreground group-hover:text-background">
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </div>
            <h3 className="mt-4 font-serif text-2xl tracking-[-0.025em]">
              {collection.name}
            </h3>
            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
              {collection.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
