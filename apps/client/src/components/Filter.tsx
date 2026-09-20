"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { normalizeSort, sortOptions } from "@/lib/catalog";

const Filter = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const selectedSort =
    normalizeSort(searchParams.get("sort") ?? undefined) ?? "newest";

  const handleFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }

    params.delete("page");

    startTransition(() => {
      const nextPath = params.size
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.push(nextPath as Route, { scroll: false });
    });
  };

  return (
    <div
      aria-busy={isPending}
      className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground"
    >
      <p role="status" className="sr-only">
        {isPending ? "Updating the collection…" : ""}
      </p>
      <label
        htmlFor="sort"
        className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground sm:ml-auto"
      >
        Sort by
      </label>
      <Select
        name="sort"
        id="sort"
        wrapperClassName="ml-auto w-52 shrink-0"
        disabled={isPending}
        value={selectedSort}
        onChange={(e) => handleFilter(e.target.value)}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
};

export default Filter;
