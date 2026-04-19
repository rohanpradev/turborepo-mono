"use client";

import { ShoppingBasket } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type CategoryItem = {
  name: string;
  slug: string;
};

const Categories = ({ categories }: { categories: Array<CategoryItem> }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const selectedCategory = searchParams.get("category") ?? "all";

  const options = [
    { name: "All", slug: "all" },
    ...categories.map((category) => ({
      name: category.name,
      slug: category.slug,
    })),
  ];

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value === "all") {
      params.delete("category");
    } else {
      params.set("category", value);
    }

    startTransition(() => {
      const nextPath = params.size
        ? `${pathname}?${params.toString()}`
        : pathname;

      router.push(nextPath as Route, { scroll: false });
    });
  };

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-2 text-sm sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {options.map((category) => (
        <button
          type="button"
          className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-2 py-2 text-center ${
            category.slug === selectedCategory ? "bg-white" : "text-gray-500"
          }`}
          key={category.slug}
          disabled={isPending}
          onClick={() => handleChange(category.slug)}
        >
          <ShoppingBasket className="w-4 h-4" />
          <span className="line-clamp-2">{category.name}</span>
        </button>
      ))}
    </div>
  );
};

export default Categories;
