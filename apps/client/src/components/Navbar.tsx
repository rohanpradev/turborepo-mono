import { Show, SignInButton } from "@clerk/nextjs";
import { Bell, Home } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import ProfileButton from "./ProfileButton";
import SearchBar from "./SearchBar";
import ShoppingCartIcon from "./ShoppingCartIcon";

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

const Navbar = () => {
  return (
    <nav className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
      <Link href="/" className="flex min-w-0 items-center gap-2">
        <Image
          src="/logo.png"
          alt="TrendLama"
          width={36}
          height={36}
          className="w-6 h-6 md:w-9 md:h-9"
        />
        <p className="truncate text-sm font-medium tracking-[0.2em] md:text-md">
          TRENDLAMA.
        </p>
      </Link>
      <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4 md:gap-6">
        <Suspense
          fallback={
            <div className="hidden min-w-0 sm:flex items-center gap-2 rounded-md ring-1 ring-gray-200 px-2 py-1 shadow-md md:min-w-56">
              <div className="h-4 w-4 rounded-full bg-gray-200" />
              <div className="h-4 flex-1 rounded bg-gray-100" />
            </div>
          }
        >
          <SearchBar />
        </Suspense>
        <Link href="/" className="rounded-full p-1 text-gray-600">
          <Home className="w-4 h-4 text-gray-600" />
        </Link>
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-full p-1 text-gray-600"
        >
          <Bell className="w-4 h-4 text-gray-600" />
        </button>
        <ShoppingCartIcon />
        {isClerkConfigured ? (
          <>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-sm text-gray-600"
                >
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <ProfileButton />
            </Show>
          </>
        ) : (
          <Link
            href={"/sign-in" as Route}
            className="rounded-md px-2 py-1 text-sm text-gray-600"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
