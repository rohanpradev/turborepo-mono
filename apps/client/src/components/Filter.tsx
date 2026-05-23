"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";

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
    <div className="my-6 flex flex-col gap-3 rounded-[1.25rem] border border-black/5 bg-white/75 p-3 text-sm text-gray-500 shadow-sm sm:flex-row sm:items-center sm:justify-end">
      <label
        htmlFor="sort"
        className="text-xs uppercase tracking-[0.18em] text-gray-400"
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
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="asc">Price: Low to High</option>
        <option value="desc">Price: High to Low</option>
      </Select>
    </div>
  );
};

export default Filter;
