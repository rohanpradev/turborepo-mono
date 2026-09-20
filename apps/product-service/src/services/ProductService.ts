import {
  type ProductCreatedMessage,
  type ProductDeletedMessage,
  type ProductUpdatedMessage,
  Topics,
} from "@repo/kafka";
import {
  db,
  or,
  type Product,
  type ProductJsonInput,
  type ProductOutboxEventCreateInput,
} from "@repo/product-db";
import type {
  ProductPayload,
  ProductRecord,
  ProductSort,
  ProductUpdatePayload,
} from "@repo/types";

type ProductFilters = {
  sort?: ProductSort;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
};

import { nowUtc, toUtcISOString } from "@/utils/timestamps";

const toProductRecord = (product: Product): ProductRecord => {
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
    sizes: [...product.sizes],
    colors: [...product.colors],
    images,
    categorySlug: product.categorySlug,
    createdAt: toUtcISOString(product.createdAt),
    updatedAt: toUtcISOString(product.updatedAt),
  };
};

const toProductCreatedMessage = (product: Product): ProductCreatedMessage => ({
  id: product.id.toString(),
  name: product.name,
  description: product.description,
  price: product.price,
  categorySlug: product.categorySlug,
  stock: 0,
  createdAt: toUtcISOString(product.createdAt),
});

const toProductUpdatedMessage = (product: Product): ProductUpdatedMessage => ({
  ...toProductCreatedMessage(product),
  updatedAt: toUtcISOString(product.updatedAt),
});

const enqueueProductEvent = <
  TTopic extends (typeof Topics)[keyof typeof Topics],
>(
  topic: TTopic,
  message:
    | ProductCreatedMessage
    | ProductDeletedMessage
    | ProductUpdatedMessage,
  options: { key?: string } = {},
): ProductOutboxEventCreateInput => ({
  id: crypto.randomUUID(),
  topic,
  eventKey: options.key ?? crypto.randomUUID(),
  payload: message as unknown as ProductJsonInput,
  updatedAt: nowUtc(),
});

export const ProductService = {
  async createProduct(data: ProductPayload): Promise<ProductRecord> {
    const product = await db.transaction(async (tx) => {
      const created = await tx.orm.public.Product.create({
        ...data,
        updatedAt: nowUtc(),
      });
      const message = toProductCreatedMessage(created);
      await tx.orm.public.ProductOutboxEvent.create(
        enqueueProductEvent(Topics.PRODUCT_CREATED, message, {
          key: message.id,
        }),
      );
      return created;
    });

    return toProductRecord(product);
  },

  async getProduct(id: number): Promise<ProductRecord | null> {
    const product = await db.orm.public.Product.first({ id });
    return product ? toProductRecord(product) : null;
  },

  async getAllProducts(
    filters: ProductFilters = {},
  ): Promise<{ items: Array<ProductRecord>; total: number }> {
    const { sort = "newest", category, search, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;
    const categoryQuery = category
      ? db.orm.public.Product.where({ categorySlug: category })
      : db.orm.public.Product;
    const filteredQuery = search
      ? categoryQuery.where((product) => {
          const pattern = `%${search}%`;
          return or(
            product.name.ilike(pattern),
            product.description.ilike(pattern),
            product.shortDescription.ilike(pattern),
          );
        })
      : categoryQuery;
    const orderedQuery =
      sort === "asc"
        ? filteredQuery.orderBy((product) => product.price.asc())
        : sort === "desc"
          ? filteredQuery.orderBy((product) => product.price.desc())
          : sort === "oldest"
            ? filteredQuery.orderBy((product) => product.createdAt.asc())
            : filteredQuery.orderBy((product) => product.createdAt.desc());

    const [items, totals] = await Promise.all([
      orderedQuery.offset(skip).limit(limit).all(),
      filteredQuery.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
    ]);

    return { items: items.map(toProductRecord), total: totals.total };
  },

  async updateProduct(
    id: number,
    updates: ProductUpdatePayload,
  ): Promise<ProductRecord | null> {
    const product = await db.transaction(async (tx) => {
      const updated = await tx.orm.public.Product.where({ id }).update({
        ...updates,
        updatedAt: nowUtc(),
      });

      if (!updated) {
        return null;
      }

      const message = toProductUpdatedMessage(updated);
      await tx.orm.public.ProductOutboxEvent.create(
        enqueueProductEvent(Topics.PRODUCT_UPDATED, message, {
          key: message.id,
        }),
      );
      return updated;
    });

    return product ? toProductRecord(product) : null;
  },

  async deleteProduct(id: number): Promise<boolean> {
    return db.transaction(async (tx) => {
      const deleted = await tx.orm.public.Product.where({ id }).delete();

      if (!deleted) {
        return false;
      }

      const message: ProductDeletedMessage = {
        id: id.toString(),
        deletedAt: new Date().toISOString(),
      };
      await tx.orm.public.ProductOutboxEvent.create(
        enqueueProductEvent(Topics.PRODUCT_DELETED, message, {
          key: message.id,
        }),
      );

      return true;
    });
  },
};
