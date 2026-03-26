import { Prisma, prisma } from "@repo/product-db";
import type {
  CategoryPayload,
  CategoryRecord,
  CategoryUpdatePayload,
} from "@repo/types";

type StoredCategory = {
  id: number;
  name: string;
  slug: string;
};

type CategoryCount = {
  categorySlug: string;
  _count: {
    _all: number;
  };
};

const isNotFoundError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2025";

const formatCategory = (
  category: StoredCategory,
  productCount?: number,
): CategoryRecord => {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    productCount,
  };
};

export const CategoryService = {
  async createCategory(data: CategoryPayload): Promise<CategoryRecord> {
    const category = await prisma.category.create({ data });
    return formatCategory(category);
  },

  async getCategory(slug: string): Promise<CategoryRecord | null> {
    const category = await prisma.category.findUnique({ where: { slug } });

    if (!category) {
      return null;
    }

    const count = await prisma.product.count({ where: { categorySlug: slug } });
    return formatCategory(category, count);
  },

  async listCategories(): Promise<Array<CategoryRecord>> {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    const counts = await prisma.product.groupBy({
      by: ["categorySlug"],
      _count: { _all: true },
    });
    const countMap = new Map<string, number>(
      counts.map((count: CategoryCount): [string, number] => [
        count.categorySlug,
        count._count._all,
      ]),
    );

    return categories.map((category: StoredCategory) =>
      formatCategory(category, countMap.get(category.slug)),
    );
  },

  async updateCategory(
    slug: string,
    data: CategoryUpdatePayload,
  ): Promise<CategoryRecord | null> {
    try {
      const category = await prisma.category.update({
        where: { slug },
        data,
      });
      const count = await prisma.product.count({
        where: { categorySlug: category.slug },
      });

      return formatCategory(category, count);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  },

  async deleteCategory(slug: string): Promise<boolean> {
    try {
      await prisma.category.delete({ where: { slug } });
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  },
};
