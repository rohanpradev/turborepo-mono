"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { sortOptions } from "@/lib/catalog";

const Filter = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const selectedSort = searchParams.get("sort") ?? "newest";

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
    <div className="my-6 flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-3 text-sm text-gray-500 shadow-sm sm:flex-row sm:items-center sm:justify-end">
      <label
        htmlFor="sort"
        className="text-xs uppercase tracking-[0.14em] text-gray-500"
      >
        Sort by
      </label>
      <Select
        name="sort"
        id="sort"
        className="sm:w-56"
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
