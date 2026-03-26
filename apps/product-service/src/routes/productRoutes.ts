import {
  bearerSecurity,
  createPaginatedListResponseSchema,
  createRoute,
  createServiceRouter,
  createSuccessResponseSchema,
  errorResponseSchema,
  jsonContent,
  messageResponseSchema,
  validationErrorResponseSchema,
} from "@repo/hono-utils";
import {
  productIdParamSchema,
  productListQuerySchema,
  productPayloadSchema,
  productRecordSchema,
  productUpdateSchema,
} from "@repo/types";
import type { ServiceVariables } from "../middleware/auth";
import { shouldBeUser } from "../middleware/auth";
import { ProductService } from "../services/ProductService";

const productResponseSchema =
  createSuccessResponseSchema(productRecordSchema).openapi("ProductResponse");
const productListResponseSchema = createPaginatedListResponseSchema(
  productRecordSchema,
).openapi("ProductListResponse");

const listProductsRoute = createRoute({
  method: "get",
  path: "/products",
  tags: ["products"],
  summary: "List products",
  description:
    "Returns catalog products with optional search, category, and sort filters.",
  request: {
    query: productListQuerySchema,
  },
  responses: {
    200: {
      description: "Products retrieved successfully.",
      content: jsonContent(productListResponseSchema),
    },
    422: {
      description: "The query parameters were invalid.",
      content: jsonContent(validationErrorResponseSchema),
    },
  },
});

const getProductRoute = createRoute({
  method: "get",
  path: "/products/{id}",
  tags: ["products"],
  summary: "Get product by id",
  request: {
    params: productIdParamSchema,
  },
  responses: {
    200: {
      description: "Product retrieved successfully.",
      content: jsonContent(productResponseSchema),
    },
    404: {
      description: "The requested product was not found.",
      content: jsonContent(errorResponseSchema),
    },
    422: {
      description: "The product id was invalid.",
      content: jsonContent(validationErrorResponseSchema),
    },
  },
});

const createProductRoute = createRoute({
  method: "post",
  path: "/products",
  tags: ["products"],
  summary: "Create product",
  description:
    "Creates a new catalog product and publishes the product.created Kafka event.",
  security: bearerSecurity,
  middleware: [shouldBeUser],
  request: {
    body: {
      required: true,
      content: jsonContent(productPayloadSchema),
    },
  },
  responses: {
    201: {
      description: "Product created successfully.",
      content: jsonContent(productResponseSchema),
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

const updateProductRoute = createRoute({
  method: "put",
  path: "/products/{id}",
  tags: ["products"],
  summary: "Update product",
  description: "Updates an existing product.",
  security: bearerSecurity,
  middleware: [shouldBeUser],
  request: {
    params: productIdParamSchema,
    body: {
      required: true,
      content: jsonContent(productUpdateSchema),
    },
  },
  responses: {
    200: {
      description: "Product updated successfully.",
      content: jsonContent(productResponseSchema),
    },
    401: {
      description: "The caller is not authenticated.",
      content: jsonContent(errorResponseSchema),
    },
    404: {
      description: "The requested product was not found.",
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

const deleteProductRoute = createRoute({
  method: "delete",
  path: "/products/{id}",
  tags: ["products"],
  summary: "Delete product",
  description:
    "Deletes a product and publishes the product.deleted Kafka event.",
  security: bearerSecurity,
  middleware: [shouldBeUser],
  request: {
    params: productIdParamSchema,
  },
  responses: {
    200: {
      description: "Product deleted successfully.",
      content: jsonContent(messageResponseSchema),
    },
    401: {
      description: "The caller is not authenticated.",
      content: jsonContent(errorResponseSchema),
    },
    404: {
      description: "The requested product was not found.",
      content: jsonContent(errorResponseSchema),
    },
    422: {
      description: "The product id was invalid.",
      content: jsonContent(validationErrorResponseSchema),
    },
    503: {
      description: "Authentication is not configured for this environment.",
      content: jsonContent(errorResponseSchema),
    },
  },
});

export const productRoutes = createServiceRouter<{
  Variables: ServiceVariables;
}>()
  .openapi(listProductsRoute, async (c) => {
    const query = c.req.valid("query");
    const { items, total } = await ProductService.getAllProducts(query);
    const pageSize = query.limit ?? 10;

    return c.json(
      {
        success: true as const,
        data: items,
        meta: {
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
      },
      200,
    );
  })
  .openapi(getProductRoute, async (c) => {
    const { id } = c.req.valid("param");
    const product = await ProductService.getProduct(id);

    if (!product) {
      return c.json(
        { success: false as const, error: "Product not found" },
        404,
      );
    }

    return c.json({ success: true as const, data: product }, 200);
  })
  .openapi(createProductRoute, async (c) => {
    const product = await ProductService.createProduct(c.req.valid("json"));
    return c.json({ success: true as const, data: product }, 201);
  })
  .openapi(updateProductRoute, async (c) => {
    const { id } = c.req.valid("param");
    const product = await ProductService.updateProduct(id, c.req.valid("json"));

    if (!product) {
      return c.json(
        { success: false as const, error: "Product not found" },
        404,
      );
    }

    return c.json({ success: true as const, data: product }, 200);
  })
  .openapi(deleteProductRoute, async (c) => {
    const { id } = c.req.valid("param");
    const deleted = await ProductService.deleteProduct(id);

    if (!deleted) {
      return c.json(
        { success: false as const, error: "Product not found" },
        404,
      );
    }

    return c.json(
      {
        success: true as const,
        message: "Product deleted successfully",
      },
      200,
    );
  });
