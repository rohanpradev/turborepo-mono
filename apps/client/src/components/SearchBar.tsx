"use client";

import { Search } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";

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
    <search className="hidden min-w-0 lg:block lg:w-[min(27vw,22rem)]">
      <form
        action="/products"
        aria-busy={isPending}
        className="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 transition-[background-color,border-color,box-shadow] focus-within:border-ring focus-within:bg-card focus-within:ring-[3px] focus-within:ring-ring/20"
        onSubmit={handleSubmit}
      >
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="search" className="sr-only">
          Search the catalog
        </label>
        <Input
          id="search"
          name="search"
          type="search"
          placeholder="Search the collection"
          className="h-6 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:outline-none focus-visible:ring-0"
          disabled={isPending}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>
    </search>
  );
};

export default SearchBar;
