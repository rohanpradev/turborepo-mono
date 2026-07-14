import {
  createCorsMiddleware,
  createORPCMiddleware,
  createRoute,
  createServiceApp,
  jsonContent,
  z,
} from "@repo/hono-utils";
import { clerkAuthMiddleware, type ServiceVariables } from "@/middleware/auth";
import { healthRoutes } from "@/routes/healthRoutes";
import { productRouter } from "@/rpc";

const serviceInfoSchema = z.object({
  message: z.string(),
  version: z.string(),
});

const rootRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["health"],
  summary: "Service metadata",
  description: "Returns basic metadata for the product service.",
  responses: {
    200: {
      description: "Service metadata retrieved successfully.",
      content: jsonContent(serviceInfoSchema),
    },
  },
});

const app = createServiceApp<{ Variables: ServiceVariables }>({
  serviceName: "product-service",
  title: "Product Service API",
  version: "1.2.0",
  description:
    "Product catalog and category management API with typed Hono contracts and live Scalar docs.",
  tags: [
    { name: "products", description: "Product catalog operations" },
    { name: "categories", description: "Category management operations" },
    { name: "health", description: "Health and service metadata" },
  ],
  theme: "kepler",
});

app.use("*", createCorsMiddleware());
app.use("*", clerkAuthMiddleware);
app.use(
  "/rpc/product/*",
  createORPCMiddleware({
    context: (c) => ({ hono: c }),
    prefix: "/rpc/product",
    router: productRouter,
  }),
);

app
  .openapi(rootRoute, (c) =>
    c.json({ message: "Product Service API", version: "1.2.0" }, 200),
  )
  .route("/", healthRoutes);

export { app };
