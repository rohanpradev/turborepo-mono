import {
  type AuthenticatedServiceVariables,
  createClerkServiceAuth,
} from "@repo/hono-utils";

export type ServiceVariables = AuthenticatedServiceVariables;

const auth = createClerkServiceAuth<ServiceVariables>({
  publicPaths: ["/api/webhooks/stripe"],
});

export const clerkAuthMiddleware = auth.clerkAuthMiddleware;
export const shouldBeUser = auth.requireUser;
