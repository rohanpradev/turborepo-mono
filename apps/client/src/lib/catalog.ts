import {
  catalogQueryString,
  type ProductRecord,
  type ProductSort,
} from "@repo/types";
import type { Route } from "next";
import type { CSSProperties } from "react";

export const HOME_PRODUCT_LIMIT = 8;
export const PRODUCT_PAGE_SIZE = 24;

export const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Price: Low to High", value: "asc" },
  { label: "Price: High to Low", value: "desc" },
] as const satisfies ReadonlyArray<{ label: string; value: ProductSort }>;

const validSorts = sortOptions.map((option) => option.value);

const colorSwatches: Record<string, string> = {
  black: "#171717",
  blue: "#2563eb",
  brown: "#8b5e34",
  gray: "#737373",
  green: "#16a34a",
  orange: "#f97316",
  pink: "#ec4899",
  purple: "#7c3aed",
  red: "#dc2626",
  white: "#f8fafc",
  yellow: "#facc15",
};

export const getColorSwatchStyle = (color: string): CSSProperties => ({
  backgroundColor: colorSwatches[color] ?? color,
});

export const getPrimaryProductImage = (
  product: Pick<ProductRecord, "colors" | "images">,
  preferredColor?: string,
) =>
  (preferredColor ? product.images[preferredColor] : undefined) ??
  product.images[product.colors[0] ?? ""] ??
  Object.values(product.images)[0] ??
  "/featured.png";

export const isExternalProductImage = (value: string) =>
  value.startsWith("http://") || value.startsWith("https://");

export const normalizeSort = (sort?: string): ProductSort | undefined =>
  sort && validSorts.includes(sort as ProductSort)
    ? (sort as ProductSort)
    : undefined;

export const normalizeSearch = (search?: string) => search?.trim() || undefined;

export const buildCatalogHref = ({
  category,
  page,
  path,
  search,
  sort,
}: {
  category?: string;
  page?: number;
  path: "/" | "/products";
  search?: string;
  sort?: ProductSort;
}): Route => {
  const query = catalogQueryString({ category, page, search, sort });
  return query ? (`${path}?${query}` as Route) : path;
};
