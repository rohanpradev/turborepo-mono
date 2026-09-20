import { db } from "@repo/product-db";
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
    const category = await db.orm.public.Category.create(data);
    return formatCategory(category);
  },

  async getCategory(slug: string): Promise<CategoryRecord | null> {
    const category = await db.orm.public.Category.where({ slug })
      .include("products", (products) => products.count())
      .first();

    if (!category) {
      return null;
    }

    return formatCategory(category, category.products);
  },

  async listCategories(): Promise<Array<CategoryRecord>> {
    const categories = await db.orm.public.Category.include(
      "products",
      (products) => products.count(),
    )
      .orderBy((category) => category.name.asc())
      .all();

    return categories.map((category) =>
      formatCategory(category, category.products),
    );
  },

  async updateCategory(
    slug: string,
    data: CategoryUpdatePayload,
  ): Promise<CategoryRecord | null> {
    const category = await db.orm.public.Category.where({ slug }).update(data);

    if (!category) {
      return null;
    }

    const totals = await db.orm.public.Product.where({
      categorySlug: category.slug,
    }).aggregate((aggregate) => ({ total: aggregate.count() }));

    return formatCategory(category, totals.total);
  },

  async deleteCategory(slug: string): Promise<boolean> {
    const category = await db.orm.public.Category.where({ slug }).delete();
    return category !== null;
  },
};
