"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const Filter = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", value);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="my-6 flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-end">
      <span>Sort by:</span>
      <select
        name="sort"
        id="sort"
        className="rounded-sm p-2 ring-1 ring-gray-200 shadow-md sm:w-auto"
        disabled={isPending}
        onChange={(e) => handleFilter(e.target.value)}
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="asc">Price: Low to High</option>
        <option value="desc">Price: High to Low</option>
      </select>
    </div>
  );
};

export default Filter;
