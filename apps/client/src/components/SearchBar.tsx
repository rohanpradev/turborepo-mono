"use client";

import { LoaderCircle, Search } from "lucide-react";
import Form from "next/form";
import { usePathname, useSearchParams } from "next/navigation";
import { useId } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";

const SearchButton = () => {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        disabled={pending}
        aria-label="Search products"
        className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Search className="size-4" aria-hidden="true" />
        )}
      </button>
      <span role="status" className="sr-only">
        {pending ? "Searching products…" : ""}
      </span>
    </>
  );
};

const SearchBar = ({ className }: { className?: string }) => {
  const inputId = useId();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preserveFilters = pathname === "/" || pathname === "/products";
  const query = searchParams.get("search") ?? "";

  return (
    <search aria-label="Catalog search" className={className}>
      <Form
        action="/products"
        className="flex h-11 items-center gap-2 rounded-lg border border-border bg-muted/60 pl-3 transition-[background-color,border-color,box-shadow] focus-within:border-ring focus-within:bg-card focus-within:ring-[3px] focus-within:ring-ring/20"
      >
        <label htmlFor={inputId} className="sr-only">
          Search the catalog
        </label>
        <Input
          key={`${pathname}:${searchParams.toString()}`}
          id={inputId}
          name="search"
          type="search"
          placeholder="Search the collection"
          className="h-6 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:outline-none focus-visible:ring-0"
          maxLength={200}
          defaultValue={query}
        />
        {preserveFilters &&
          ["category", "sort"].map((name) => {
            const value = searchParams.get(name);
            return value ? (
              <input key={name} type="hidden" name={name} value={value} />
            ) : null;
          })}
        <SearchButton />
      </Form>
    </search>
  );
};

export default SearchBar;
