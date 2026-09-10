import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AuthControls from "@/components/AuthControls";
import BrandMark from "@/components/BrandMark";
import MobileNavigation from "@/components/MobileNavigation";
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
    <header className="sticky top-0 z-40 mb-6 border-b border-border bg-background/95 backdrop-blur-xl">
      <Link
        href="/products?sort=newest"
        className="group flex min-h-8 items-center justify-center gap-2 bg-primary px-4 py-1.5 text-center text-[0.6875rem] font-semibold tracking-[0.04em] text-background/80 transition-colors hover:text-background"
      >
        <span>Everyday essentials, thoughtfully chosen</span>
        <span className="hidden text-background/35 sm:inline">/</span>
        <span className="hidden text-background/60 sm:inline">
          Explore the latest edit
        </span>
        <ArrowRight
          className="size-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>

      <nav
        aria-label="Primary navigation"
        className="flex min-h-20 items-center gap-2 px-0 py-3"
      >
        <Link
          href="/"
          aria-label="Common Goods home"
          className="group flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <BrandMark className="size-9 shrink-0 transition-transform group-hover:-rotate-2" />
          <span>
            <span className="block font-serif text-xl font-semibold leading-none tracking-[-0.025em] text-foreground">
              Common Goods
            </span>
            <span className="mt-1 block text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Good things, every day
            </span>
          </span>
        </Link>

        <div className="ml-6 hidden items-center gap-0.5 xl:flex">
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
            <SearchBar className="hidden min-w-0 lg:block lg:w-[min(27vw,22rem)]" />
          </Suspense>

          <ShoppingCartIcon />
          <MobileNavigation links={catalogLinks} />
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
      <div className="border-t border-border px-3 py-2.5 lg:hidden">
        <Suspense
          fallback={<div className="h-10 animate-pulse rounded-lg bg-muted" />}
        >
          <SearchBar className="w-full" />
        </Suspense>
      </div>
    </header>
  );
};

export default Navbar;
