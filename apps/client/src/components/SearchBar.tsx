"use client";

import { Search } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState, useTransition } from "react";

const SearchBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    setQuery(searchParams.get("search") ?? "");
  }, [searchParams]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextParams = new URLSearchParams();

    if (pathname === "/" || pathname === "/products") {
      const category = searchParams.get("category");
      const sort = searchParams.get("sort");

      if (category) {
        nextParams.set("category", category);
      }

      if (sort) {
        nextParams.set("sort", sort);
      }
    }

    const normalizedQuery = query.trim();

    if (normalizedQuery) {
      nextParams.set("search", normalizedQuery);
    }

    startTransition(() => {
      const nextPath = nextParams.size
        ? (`/products?${nextParams.toString()}` as Route)
        : ("/products" as Route);

      router.push(nextPath);
    });
  };

  return (
    <search className="hidden min-w-0 sm:block md:min-w-56">
      <form
        action="/products"
        className="flex items-center gap-2 rounded-md ring-1 ring-gray-200 px-2 py-1 shadow-md"
        onSubmit={handleSubmit}
      >
        <Search className="w-4 h-4 text-gray-500" />
        <input
          id="search"
          name="search"
          type="search"
          placeholder="Search products..."
          className="min-w-0 flex-1 text-sm outline-0"
          disabled={isPending}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>
    </search>
  );
};

export default SearchBar;
