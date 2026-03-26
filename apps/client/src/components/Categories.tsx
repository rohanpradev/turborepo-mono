"use client";

import { ShoppingBasket } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CategoryItem = {
  name: string;
  slug: string;
};

const Categories = ({ categories }: { categories: Array<CategoryItem> }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
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

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 bg-gray-100 p-2 rounded-lg mb-4 text-sm">
      {options.map((category) => (
        <button
          type="button"
          className={`flex items-center justify-center gap-2 cursor-pointer px-2 py-1 rounded-md ${
            category.slug === selectedCategory ? "bg-white" : "text-gray-500"
          }`}
          key={category.slug}
          onClick={() => handleChange(category.slug)}
        >
          <ShoppingBasket className="w-4 h-4" />
          {category.name}
        </button>
      ))}
    </div>
  );
};

export default Categories;
