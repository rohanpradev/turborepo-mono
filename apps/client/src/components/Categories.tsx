import type { ProductSort } from "@repo/types";
import NavigationFeedback from "@/components/NavigationFeedback";
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
    <nav
      aria-label="Product categories"
      className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-2 text-sm sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {options.map((category) => (
        <Button
          href={buildCatalogHref({
            category: category.slug,
            path,
            search,
            sort,
          })}
          variant={category.slug === selectedCategory ? "default" : "outline"}
          size="sm"
          className="h-11 shrink-0 rounded-full px-4"
          key={category.slug}
          aria-current={category.slug === selectedCategory ? "page" : undefined}
          scroll={false}
        >
          <NavigationFeedback>
            <span
              className={`size-1.5 rounded-full ${
                category.slug === selectedCategory
                  ? "bg-background"
                  : "bg-primary"
              }`}
              aria-hidden="true"
            />
            <span>{category.name}</span>
          </NavigationFeedback>
        </Button>
      ))}
    </nav>
  );
};

export default Categories;
