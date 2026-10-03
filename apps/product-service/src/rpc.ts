import { implement } from "@orpc/server";
import { productContract } from "@repo/contracts";
import {
  createORPCException,
  getAuthenticatedAdminUserId,
} from "@repo/hono-utils";
import { InventoryConflict, listStock, setStock } from "@repo/product-db";
import type { Context } from "hono";
import { CategoryService } from "@/services/CategoryService";
import { ProductService } from "@/services/ProductService";

type RPCContext = {
  hono: Context;
};

const os = implement(productContract).$context<RPCContext>();

const toProductListResponse = async (
  input: Parameters<typeof ProductService.getAllProducts>[0] = {},
) => {
  const { items, total } = await ProductService.getAllProducts(input);
  const page = input.page ?? 1;
  const pageSize = input.limit ?? 10;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    success: true as const,
    data: items,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

const requireAdmin = (context: RPCContext) =>
  getAuthenticatedAdminUserId(context.hono);

export const productRouter = os.router({
  inventory: {
    availability: os.inventory.availability.handler(async ({ input }) => ({
      success: true as const,
      data: (await listStock(input.id)).map(
        ({ size, color, onHand, reserved }) => ({
          size,
          color,
          available: onHand - reserved,
        }),
      ),
    })),
    list: os.inventory.list.handler(async ({ context, input }) => {
      requireAdmin(context);
      return { success: true as const, data: await listStock(input.id) };
    }),
    set: os.inventory.set.handler(async ({ context, input }) => {
      const actor = requireAdmin(context);
      const product = await ProductService.getProduct(input.id);
      if (
        !product?.sizes.includes(input.size) ||
        !product.colors.includes(input.color)
      )
        throw createORPCException(400, "Choose an existing product variant.");
      try {
        await setStock(input.id, input.size, input.color, input.onHand, actor);
      } catch (error) {
        if (!(error instanceof InventoryConflict))
          throw createORPCException(503, "Inventory storage is unavailable.");
        throw createORPCException(
          409,
          "Stock cannot be reduced below reserved quantities.",
        );
      }
      return { success: true as const, message: "Stock updated" };
    }),
  },
  category: {
    create: os.category.create.handler(async ({ context, input }) => {
      requireAdmin(context);
      return {
        success: true as const,
        data: await CategoryService.createCategory(input),
      };
    }),
    delete: os.category.delete.handler(async ({ context, input }) => {
      requireAdmin(context);
      const deleted = await CategoryService.deleteCategory(input.slug);

      if (!deleted) {
        throw createORPCException(404, "Category not found");
      }

      return {
        success: true as const,
        message: "Category deleted successfully",
      };
    }),
    get: os.category.get.handler(async ({ input }) => {
      const category = await CategoryService.getCategory(input.slug);

      if (!category) {
        throw createORPCException(404, "Category not found");
      }

      return { success: true as const, data: category };
    }),
    list: os.category.list.handler(async () => ({
      success: true as const,
      data: await CategoryService.listCategories(),
    })),
    update: os.category.update.handler(async ({ context, input }) => {
      requireAdmin(context);
      const category = await CategoryService.updateCategory(
        input.slug,
        input.payload,
      );

      if (!category) {
        throw createORPCException(404, "Category not found");
      }

      return { success: true as const, data: category };
    }),
  },
  product: {
    create: os.product.create.handler(async ({ context, input }) => {
      requireAdmin(context);
      return {
        success: true as const,
        data: await ProductService.createProduct(input),
      };
    }),
    delete: os.product.delete.handler(async ({ context, input }) => {
      requireAdmin(context);
      if ((await listStock(input.id)).length > 0)
        throw createORPCException(
          409,
          "Set every variant stock count to zero before deleting this product. Reserved units must be resolved first.",
        );
      const deleted = await ProductService.deleteProduct(input.id);

      if (!deleted) {
        throw createORPCException(404, "Product not found");
      }

      return {
        success: true as const,
        message: "Product deleted successfully",
      };
    }),
    get: os.product.get.handler(async ({ input }) => {
      const product = await ProductService.getProduct(input.id);

      if (!product) {
        throw createORPCException(404, "Product not found");
      }

      return { success: true as const, data: product };
    }),
    list: os.product.list.handler(async ({ input }) =>
      toProductListResponse(input ?? {}),
    ),
    update: os.product.update.handler(async ({ context, input }) => {
      requireAdmin(context);
      const product = await ProductService.updateProduct(
        input.id,
        input.payload,
      );

      if (!product) {
        throw createORPCException(404, "Product not found");
      }

      return { success: true as const, data: product };
    }),
  },
});
