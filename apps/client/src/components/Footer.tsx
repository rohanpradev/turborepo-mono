import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

const Footer = () => {
  return (
    <footer className="mt-18 overflow-hidden rounded-2xl bg-foreground text-background">
      <div className="flex flex-col gap-6 border-b border-white/12 px-6 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-9 sm:py-10 lg:px-12">
        <div className="max-w-2xl">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-background/50">
            The Common Goods edit
          </p>
          <h2 className="mt-3 max-w-xl font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.035em] sm:text-5xl">
            Everyday pieces, thoughtfully chosen.
          </h2>
        </div>
        <Link
          href="/products"
          className="group inline-flex min-h-11 w-fit items-center gap-3 rounded-lg bg-background px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-background/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
        >
          Explore the collection
          <ArrowUpRight
            className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>

      <div className="grid gap-10 px-6 py-9 sm:grid-cols-2 sm:px-9 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-12">
        <div className="space-y-4">
          <Link href="/" className="flex w-fit items-center gap-3 rounded-xl">
            <BrandMark className="size-9 shrink-0" inverted />
            <span className="font-serif text-xl font-semibold">
              Common Goods
            </span>
          </Link>
          <p className="max-w-xs text-sm leading-6 text-white/60">
            A considered storefront for apparel and footwear that works hard,
            wears well, and feels like you.
          </p>
          <p className="text-xs text-white/45">© 2026 Common Goods.</p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
            Explore
          </h3>
          <div className="mt-4 flex flex-col items-start gap-3 text-sm text-white/72">
            <Link
              className="inline-flex min-h-6 items-center hover:text-white"
              href="/"
            >
              Homepage
            </Link>
            <Link
              className="inline-flex min-h-6 items-center hover:text-white"
              href="/products"
            >
              All products
            </Link>
            <Link
              className="inline-flex min-h-6 items-center hover:text-white"
              href="/cart"
              prefetch={false}
            >
              Your bag
            </Link>
            <Link
              className="inline-flex min-h-6 items-center hover:text-white"
              href="/orders"
              prefetch={false}
            >
              Order history
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
            The edit
          </h3>
          <div className="mt-4 flex flex-col items-start gap-3 text-sm text-white/72">
            <Link
              className="inline-flex min-h-6 items-center hover:text-white"
              href="/products?sort=newest"
            >
              New arrivals
            </Link>
            <Link
              className="inline-flex min-h-6 items-center hover:text-white"
              href="/products?sort=asc"
            >
              Under budget
            </Link>
            <Link
              className="inline-flex min-h-6 items-center hover:text-white"
              href="/products?sort=desc"
            >
              Premium picks
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
            Our standard
          </h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/72">
            <span>Secure payments</span>
            <span>Live order status</span>
            <span>Curated inventory</span>
            <span>Fast support flow</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
