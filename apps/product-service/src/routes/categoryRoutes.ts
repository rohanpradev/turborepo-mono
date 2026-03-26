import {
  bearerSecurity,
  createListResponseSchema,
  createRoute,
  createServiceRouter,
  createSuccessResponseSchema,
  errorResponseSchema,
  jsonContent,
  messageResponseSchema,
  validationErrorResponseSchema,
} from "@repo/hono-utils";
import {
  categoryPayloadSchema,
  categoryRecordSchema,
  categorySlugParamSchema,
  categoryUpdateSchema,
} from "@repo/types";
import type { ServiceVariables } from "../middleware/auth";
import { shouldBeUser } from "../middleware/auth";
import { CategoryService } from "../services/CategoryService";

const categoryResponseSchema =
  createSuccessResponseSchema(categoryRecordSchema).openapi("CategoryResponse");
const categoryListResponseSchema = createListResponseSchema(
  categoryRecordSchema,
).openapi("CategoryListResponse");

const listCategoriesRoute = createRoute({
  method: "get",
  path: "/categories",
  tags: ["categories"],
  summary: "List categories",
  description: "Returns all categories with product counts when available.",
  responses: {
    200: {
      description: "Categories retrieved successfully.",
      content: jsonContent(categoryListResponseSchema),
    },
  },
});

const getCategoryRoute = createRoute({
  method: "get",
  path: "/categories/{slug}",
  tags: ["categories"],
  summary: "Get category by slug",
  request: {
    params: categorySlugParamSchema,
  },
  responses: {
    200: {
      description: "Category retrieved successfully.",
      content: jsonContent(categoryResponseSchema),
    },
    404: {
      description: "The requested category was not found.",
      content: jsonContent(errorResponseSchema),
    },
    422: {
      description: "The category slug was invalid.",
      content: jsonContent(validationErrorResponseSchema),
    },
  },
});

const createCategoryRoute = createRoute({
  method: "post",
  path: "/categories",
  tags: ["categories"],
  summary: "Create category",
  security: bearerSecurity,
  middleware: [shouldBeUser],
  request: {
    body: {
      required: true,
      content: jsonContent(categoryPayloadSchema),
    },
  },
  responses: {
    201: {
      description: "Category created successfully.",
      content: jsonContent(categoryResponseSchema),
    },
    401: {
      description: "The caller is not authenticated.",
      content: jsonContent(errorResponseSchema),
    },
    422: {
      description: "The request body was invalid.",
      content: jsonContent(validationErrorResponseSchema),
    },
    503: {
      description: "Authentication is not configured for this environment.",
      content: jsonContent(errorResponseSchema),
    },
  },
});

const updateCategoryRoute = createRoute({
  method: "put",
  path: "/categories/{slug}",
  tags: ["categories"],
  summary: "Update category",
  security: bearerSecurity,
  middleware: [shouldBeUser],
  request: {
    params: categorySlugParamSchema,
    body: {
      required: true,
      content: jsonContent(categoryUpdateSchema),
    },
  },
  responses: {
    200: {
      description: "Category updated successfully.",
      content: jsonContent(categoryResponseSchema),
    },
    401: {
      description: "The caller is not authenticated.",
      content: jsonContent(errorResponseSchema),
    },
    404: {
      description: "The requested category was not found.",
      content: jsonContent(errorResponseSchema),
    },
    422: {
      description: "The path or request body was invalid.",
      content: jsonContent(validationErrorResponseSchema),
    },
    503: {
      description: "Authentication is not configured for this environment.",
      content: jsonContent(errorResponseSchema),
    },
  },
});

const deleteCategoryRoute = createRoute({
  method: "delete",
  path: "/categories/{slug}",
  tags: ["categories"],
  summary: "Delete category",
  security: bearerSecurity,
  middleware: [shouldBeUser],
  request: {
    params: categorySlugParamSchema,
  },
  responses: {
    200: {
      description: "Category deleted successfully.",
      content: jsonContent(messageResponseSchema),
    },
    401: {
      description: "The caller is not authenticated.",
      content: jsonContent(errorResponseSchema),
    },
    404: {
      description: "The requested category was not found.",
      content: jsonContent(errorResponseSchema),
    },
    422: {
      description: "The category slug was invalid.",
      content: jsonContent(validationErrorResponseSchema),
    },
    503: {
      description: "Authentication is not configured for this environment.",
      content: jsonContent(errorResponseSchema),
    },
  },
});

export const categoryRoutes = createServiceRouter<{
  Variables: ServiceVariables;
}>()
  .openapi(listCategoriesRoute, async (c) => {
    const categories = await CategoryService.listCategories();
    return c.json({ success: true as const, data: categories }, 200);
  })
  .openapi(getCategoryRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const category = await CategoryService.getCategory(slug);

    if (!category) {
      return c.json(
        { success: false as const, error: "Category not found" },
        404,
      );
    }

    return c.json({ success: true as const, data: category }, 200);
  })
  .openapi(createCategoryRoute, async (c) => {
    const category = await CategoryService.createCategory(c.req.valid("json"));
    return c.json({ success: true as const, data: category }, 201);
  })
  .openapi(updateCategoryRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const category = await CategoryService.updateCategory(
      slug,
      c.req.valid("json"),
    );

    if (!category) {
      return c.json(
        { success: false as const, error: "Category not found" },
        404,
      );
    }

    return c.json({ success: true as const, data: category }, 200);
  })
  .openapi(deleteCategoryRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const deleted = await CategoryService.deleteCategory(slug);

    if (!deleted) {
      return c.json(
        { success: false as const, error: "Category not found" },
        404,
      );
    }

    return c.json({ success: true as const, message: "Category deleted" }, 200);
  });
