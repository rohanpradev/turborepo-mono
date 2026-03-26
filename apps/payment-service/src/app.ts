import {
  createCorsMiddleware,
  createRoute,
  createServiceApp,
  jsonContent,
  z,
} from "@repo/hono-utils";
import { clerkAuthMiddleware, type ServiceVariables } from "./middleware/auth";
import { healthRoutes } from "./routes/healthRoutes";
import { opsRoutes } from "./routes/opsRoutes";
import { sessionRoutes } from "./routes/sessionRoutes";
import { webhookRoutes } from "./routes/webhookRoutes";

const serviceInfoSchema = z.object({
  message: z.string(),
  version: z.string(),
});

const rootRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["health"],
  summary: "Service metadata",
  description: "Returns basic metadata for the payment service.",
  responses: {
    200: {
      description: "Service metadata retrieved successfully.",
      content: jsonContent(serviceInfoSchema),
    },
  },
});

const app = createServiceApp<{ Variables: ServiceVariables }>({
  title: "Payment Service API",
  version: "1.0.0",
  description:
    "Stripe checkout and webhook service with typed Hono contracts and Kafka payment events.",
  tags: [
    { name: "checkout", description: "Checkout session operations" },
    { name: "webhooks", description: "Stripe webhook handlers" },
    { name: "ops", description: "Operational diagnostics and event visibility" },
    { name: "health", description: "Health and service metadata" },
  ],
  theme: "kepler",
});

app.use("*", createCorsMiddleware());
app.use("*", clerkAuthMiddleware);

const routes = app
  .openapi(rootRoute, (c) =>
    c.json({ message: "Payment Service API", version: "1.0.0" }, 200),
  )
  .route("/", healthRoutes)
  .route("/", opsRoutes)
  .route("/", sessionRoutes)
  .route("/", webhookRoutes);

export type AppType = typeof routes;
export { app };
