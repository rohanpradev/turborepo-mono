import { Show, SignInButton } from "@clerk/nextjs";
import { ArrowUpRight, Search, ShoppingBag } from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import SearchBar from "@/components/SearchBar";
import ShoppingCartIcon from "@/components/ShoppingCartIcon";
import { Button } from "@/components/ui/button";

const ProfileButton = dynamic(() => import("@/components/ProfileButton"));

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("_here"),
);

const Navbar = () => {
  return (
    <nav className="sticky top-3 z-40 mb-8 flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-900/10 bg-[#fffdf9]/90 px-3 py-3 shadow-[0_14px_40px_-24px_rgba(39,31,25,0.45)] backdrop-blur-xl sm:px-5">
      <Link href="/" className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-stone-950 text-white shadow-lg shadow-stone-900/15">
          <ShoppingBag className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-serif text-lg font-semibold leading-5 tracking-tight text-stone-950">
            Common Goods
          </p>
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Everyday objects
          </p>
        </div>
      </Link>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3 md:gap-4">
        <Suspense
          fallback={
            <div className="hidden min-w-0 items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-2 shadow-sm sm:flex md:min-w-72">
              <div className="h-4 w-4 rounded-full bg-gray-200" />
              <div className="h-4 flex-1 rounded bg-gray-100" />
            </div>
          }
        >
          <SearchBar />
        </Suspense>
        <Link
          href={"/products" as Route}
          className="hidden h-10 items-center gap-1 rounded-full px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-100 sm:inline-flex"
        >
          Products
          <ArrowUpRight className="size-3.5" />
        </Link>
        <Link
          href={"/products" as Route}
          aria-label="Search products"
          className="inline-flex rounded-full border border-black/10 bg-white/80 p-2 text-gray-600 shadow-sm transition hover:border-black/20 hover:bg-gray-50 sm:hidden"
        >
          <Search className="h-4 w-4 text-gray-600" />
        </Link>
        <ShoppingCartIcon />
        {isClerkConfigured ? (
          <>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button type="button" variant="outline">
                  Sign in
                </Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <ProfileButton />
            </Show>
          </>
        ) : (
          <Button href={"/sign-in" as Route} variant="outline">
            Sign in
          </Button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
