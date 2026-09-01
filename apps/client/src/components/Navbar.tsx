import { ArrowRight, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AuthControls from "@/components/AuthControls";
import BrandMark from "@/components/BrandMark";
import SearchBar from "@/components/SearchBar";
import ShoppingCartIcon from "@/components/ShoppingCartIcon";
import { Button } from "@/components/ui/button";

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("_here"),
);

const catalogLinks = [
  { href: "/products?sort=newest", label: "New" },
  { href: "/products?category=t-shirts", label: "T-shirts" },
  { href: "/products?category=outerwear", label: "Outerwear" },
  { href: "/products?category=denim", label: "Denim" },
  { href: "/products?category=shoes", label: "Shoes" },
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

const Navbar = () => {
  return (
    <header className="sticky top-2 z-40 mb-8 overflow-hidden rounded-xl border border-border/90 bg-card shadow-[0_12px_35px_-26px_rgba(28,25,23,0.55)] sm:top-3">
      <Link
        href="/products?sort=newest"
        className="group flex min-h-8 items-center justify-center gap-2 bg-foreground px-4 py-1.5 text-center text-[0.6875rem] font-semibold tracking-[0.04em] text-background/80 transition-colors hover:text-background"
      >
        <span>New season edit</span>
        <span className="hidden text-background/35 sm:inline">/</span>
        <span className="hidden text-background/60 sm:inline">
          Complimentary delivery over $75
        </span>
        <ArrowRight
          className="size-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>

      <nav
        aria-label="Primary navigation"
        className="flex min-h-16 items-center gap-4 px-3 py-2.5 sm:px-4 lg:px-5"
      >
        <Link
          href="/"
          aria-label="Common Goods home"
          className="group flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <BrandMark className="size-9 shrink-0 transition-transform group-hover:-rotate-2" />
          <span className="hidden sm:block">
            <span className="block font-serif text-lg font-semibold leading-none tracking-[-0.025em] text-foreground">
              Common Goods
            </span>
            <span className="mt-1 block text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Everyday objects
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-0.5 xl:flex">
          {catalogLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
          <Suspense
            fallback={
              <div className="hidden h-10 w-[min(30vw,22rem)] animate-pulse rounded-lg bg-muted lg:block" />
            }
          >
            <SearchBar />
          </Suspense>

          <Link
            href={"/products" as Route}
            aria-label="Search and browse products"
            className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 lg:hidden"
          >
            <Search className="size-4" aria-hidden="true" />
          </Link>
          <ShoppingCartIcon />
          {isClerkConfigured ? (
            <AuthControls />
          ) : (
            <Button
              href={"/sign-in" as Route}
              variant="outline"
              size="sm"
              className="hidden min-[430px]:inline-flex"
            >
              Sign in
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
