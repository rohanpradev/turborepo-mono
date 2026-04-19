import {
  type AuthenticatedServiceVariables,
  createClerkServiceAuth,
} from "@repo/hono-utils";

export type ServiceVariables = AuthenticatedServiceVariables;

const auth = createClerkServiceAuth<ServiceVariables>();

export const clerkAuthMiddleware = auth.clerkAuthMiddleware;
export const shouldBeAdmin = auth.requireAdmin;
