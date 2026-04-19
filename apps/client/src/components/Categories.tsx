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
    <div className="mb-5 flex flex-wrap gap-2 rounded-[1.5rem] border border-black/5 bg-white/80 p-2 text-sm shadow-sm backdrop-blur">
      {options.map((category) => (
        <button
          type="button"
          className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-center transition-all ${
            category.slug === selectedCategory
              ? "bg-gray-950 text-white shadow-sm"
              : "border border-black/5 bg-white text-gray-600 hover:bg-gray-50"
          }`}
          key={category.slug}
          disabled={isPending}
          onClick={() => handleChange(category.slug)}
        >
          <ShoppingBasket className="h-4 w-4" />
          <span className="line-clamp-2">{category.name}</span>
        </button>
      ))}
    </div>
  );
};

export default Categories;
