"use client";

import { ShoppingBasket } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

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

    params.delete("page");

    startTransition(() => {
      const nextPath = params.size
        ? `${pathname}?${params.toString()}`
        : pathname;

      router.push(nextPath as Route, { scroll: false });
    });
  };

  return (
    <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      {options.map((category) => (
        <Button
          type="button"
          variant={category.slug === selectedCategory ? "default" : "outline"}
          size="lg"
          className="shrink-0 px-4"
          key={category.slug}
          disabled={isPending}
          aria-pressed={category.slug === selectedCategory}
          onClick={() => handleChange(category.slug)}
        >
          <ShoppingBasket className="h-4 w-4" />
          <span className="line-clamp-2">{category.name}</span>
        </Button>
      ))}
    </div>
  );
};

export default Categories;
