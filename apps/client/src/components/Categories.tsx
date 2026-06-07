import type { ProductSort } from "@repo/types";
import { ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildCatalogHref } from "@/lib/catalog";

type CategoryItem = {
  name: string;
  slug: string;
};

const Categories = ({
  categories,
  path,
  search,
  selectedCategory = "all",
  sort,
}: {
  categories: Array<CategoryItem>;
  path: "/" | "/products";
  search?: string;
  selectedCategory?: string;
  sort?: ProductSort;
}) => {
  const options = [
    { name: "All", slug: "all" },
    ...categories.map((category) => ({
      name: category.name,
      slug: category.slug,
    })),
  ];

  return (
    <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      {options.map((category) => (
        <Button
          href={buildCatalogHref({
            category: category.slug,
            path,
            search,
            sort,
          })}
          variant={category.slug === selectedCategory ? "default" : "outline"}
          size="lg"
          className="shrink-0 px-4"
          key={category.slug}
          aria-current={category.slug === selectedCategory ? "page" : undefined}
          scroll={false}
        >
          <ShoppingBasket className="h-4 w-4" />
          <span className="line-clamp-2">{category.name}</span>
        </Button>
      ))}
    </div>
  );
};

export default Categories;
