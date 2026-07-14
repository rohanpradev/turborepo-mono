import {
  type ProductCreatedMessage,
  type ProductDeletedMessage,
  type ProductUpdatedMessage,
  Topics,
} from "@repo/kafka";
import { Prisma, type Product, prisma } from "@repo/product-db";
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

const isNotFoundError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2025";

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
    sizes: product.sizes,
    colors: product.colors,
    images,
    categorySlug: product.categorySlug,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
};

const toProductCreatedMessage = (product: Product): ProductCreatedMessage => ({
  id: product.id.toString(),
  name: product.name,
  description: product.description,
  price: product.price,
  categorySlug: product.categorySlug,
  stock: 0,
  createdAt: product.createdAt.toISOString(),
});

const toProductUpdatedMessage = (product: Product): ProductUpdatedMessage => ({
  ...toProductCreatedMessage(product),
  updatedAt: product.updatedAt.toISOString(),
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
) => ({
  topic,
  eventKey: options.key ?? crypto.randomUUID(),
  payload: message as unknown as Prisma.InputJsonValue,
});

export const ProductService = {
  async createProduct(data: ProductPayload): Promise<ProductRecord> {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data });
      const message = toProductCreatedMessage(created);
      await tx.productOutboxEvent.create({
        data: enqueueProductEvent(Topics.PRODUCT_CREATED, message, {
          key: message.id,
        }),
      });
      return created;
    });

    return toProductRecord(product);
  },

  async getProduct(id: number): Promise<ProductRecord | null> {
    const product = await prisma.product.findUnique({ where: { id } });
    return product ? toProductRecord(product) : null;
  },

  async getAllProducts(
    filters: ProductFilters = {},
  ): Promise<{ items: Array<ProductRecord>; total: number }> {
    const { sort = "newest", category, search, page = 1, limit = 10 } = filters;
    const where: Prisma.ProductWhereInput = {};
    const skip = (page - 1) * limit;

    if (category) {
      where.categorySlug = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { shortDescription: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "asc"
        ? { price: Prisma.SortOrder.asc }
        : sort === "desc"
          ? { price: Prisma.SortOrder.desc }
          : sort === "oldest"
            ? { createdAt: Prisma.SortOrder.asc }
            : { createdAt: Prisma.SortOrder.desc };

    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip, take: limit }),
      prisma.product.count({ where }),
    ]);

    return { items: items.map(toProductRecord), total };
  },

  async updateProduct(
    id: number,
    updates: ProductUpdatePayload,
  ): Promise<ProductRecord | null> {
    try {
      const product = await prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id },
          data: updates,
        });
        const message = toProductUpdatedMessage(updated);
        await tx.productOutboxEvent.create({
          data: enqueueProductEvent(Topics.PRODUCT_UPDATED, message, {
            key: message.id,
          }),
        });
        return updated;
      });

      return toProductRecord(product);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  },

  async deleteProduct(id: number): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.product.delete({ where: { id } });
        const message: ProductDeletedMessage = {
          id: id.toString(),
          deletedAt: new Date().toISOString(),
        };
        await tx.productOutboxEvent.create({
          data: enqueueProductEvent(Topics.PRODUCT_DELETED, message, {
            key: message.id,
          }),
        });
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }

      throw error;
    }

    return true;
  },
};
