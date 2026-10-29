import type { Product } from "@repo/product-db";
import type { ProductRecord } from "@repo/types";
import { toUtcISOString } from "./timestamps";

export const toProductRecord = (product: Product): ProductRecord => {
  const images =
    product.images &&
    typeof product.images === "object" &&
    !Array.isArray(product.images)
      ? Object.fromEntries(
          Object.entries(product.images).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : {};

  return {
    id: product.id,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    price: product.price,
    // PostgreSQL permits null array elements in legacy rows. Prisma now
    // reflects that storage shape; the catalog API continues to expose strings.
    sizes: product.sizes.filter((size): size is string => size !== null),
    colors: product.colors.filter((color): color is string => color !== null),
    images,
    categorySlug: product.categorySlug,
    createdAt: toUtcISOString(product.createdAt),
    updatedAt: toUtcISOString(product.updatedAt),
  };
};
