import {
  type ProductCreatedMessage,
  type ProductDeletedMessage,
  Topics,
} from "@repo/kafka";
import { Prisma, type Product, prisma } from "@repo/product-db";
import type {
  ProductPayload,
  ProductRecord,
  ProductSort,
  ProductUpdatePayload,
} from "@repo/types";
import { producer } from "../utils/kafka";

type ProductFilters = {
  sort?: ProductSort;
  category?: string;
  search?: string;
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

export const ProductService = {
  async createProduct(data: ProductPayload): Promise<ProductRecord> {
    const product = await prisma.product.create({ data });

    const message: ProductCreatedMessage = {
      id: product.id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      categorySlug: product.categorySlug,
      stock: 0,
      createdAt: product.createdAt.toISOString(),
    };

    await producer.send(Topics.PRODUCT_CREATED, message, {
      key: message.id,
    });
    console.log(`Published product.created event for product ${product.id}`);

    return toProductRecord(product);
  },

  async getProduct(id: number): Promise<ProductRecord | null> {
    const product = await prisma.product.findUnique({ where: { id } });
    return product ? toProductRecord(product) : null;
  },

  async getAllProducts(
    filters: ProductFilters = {},
  ): Promise<{ items: Array<ProductRecord>; total: number }> {
    const { sort = "newest", category, search, limit = 10 } = filters;
    const where: Prisma.ProductWhereInput = {};

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
      prisma.product.findMany({ where, orderBy, take: limit }),
      prisma.product.count({ where }),
    ]);

    return { items: items.map(toProductRecord), total };
  },

  async updateProduct(
    id: number,
    updates: ProductUpdatePayload,
  ): Promise<ProductRecord | null> {
    try {
      const product = await prisma.product.update({
        where: { id },
        data: updates,
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
      await prisma.product.delete({ where: { id } });
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }

      throw error;
    }

    const message: ProductDeletedMessage = {
      id: id.toString(),
      deletedAt: new Date().toISOString(),
    };

    await producer.send(Topics.PRODUCT_DELETED, message, {
      key: message.id,
    });
    console.log(`Published product.deleted event for product ${id}`);

    return true;
  },
};
