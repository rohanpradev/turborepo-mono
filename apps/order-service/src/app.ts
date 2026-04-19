import {
  createCorsMiddleware,
  createRoute,
  createServiceApp,
  jsonContent,
  z,
} from "@repo/hono-utils";
import { clerkAuthMiddleware, type ServiceVariables } from "@/middleware/auth";
import { healthRoutes } from "@/routes/healthRoutes";
import { orderRoutes } from "@/routes/orderRoutes";

const serviceInfoSchema = z.object({
  message: z.string(),
  version: z.string(),
});

const rootRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["health"],
  summary: "Service metadata",
  description: "Returns basic metadata for the order service.",
  responses: {
    200: {
      description: "Service metadata retrieved successfully.",
      content: jsonContent(serviceInfoSchema),
    },
  },
});

const app = createServiceApp<{ Variables: ServiceVariables }>({
  title: "Order Service API",
  version: "1.0.0",
  description:
    "Order query service backed by a Kafka-fed MongoDB read model, with typed Hono contracts and live Scalar docs.",
  tags: [
    { name: "orders", description: "Order query operations" },
    { name: "health", description: "Health and service metadata" },
  ],
  theme: "kepler",
});

app.use("*", createCorsMiddleware());
app.use("*", clerkAuthMiddleware);

app
  .openapi(rootRoute, (c) =>
    c.json({ message: "Order Service API", version: "1.0.0" }, 200),
  )
  .route("/", healthRoutes)
  .route("/", orderRoutes);

export { app };
