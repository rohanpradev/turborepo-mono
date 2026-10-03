import { createORPCException } from "@repo/hono-utils";
import type { CheckoutSnapshot } from "../storage/payment-store";

const inventoryRequest = async (action: string, payload: unknown) => {
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  const origin = process.env.PRODUCT_SERVICE_INTERNAL_URL;
  if (!token || token.length < 32 || !origin)
    throw new Error("Inventory service credentials are not configured.");
  const response = await fetch(
    new URL(`/internal/inventory/${action}`, origin),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-service-token": token,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw createORPCException(
      response.status === 409 ? 409 : 503,
      "The selected stock could not be reserved or finalized. Please retry.",
    );
};
export const reserveCheckoutStock = (snapshot: CheckoutSnapshot) =>
  inventoryRequest("reserve", {
    id: snapshot.id,
    userId: snapshot.userId,
    expiresAt: snapshot.expiresAt,
    items: snapshot.items.map((item) => ({
      ...item,
      productId: Number(item.productId),
    })),
  });
export const commitCheckoutStock = (id: string) =>
  inventoryRequest("commit", { id });
export const releaseCheckoutStock = (id: string) =>
  inventoryRequest("release", { id });
