import { timingSafeEqual } from "node:crypto";
import { createServiceRouter } from "@repo/hono-utils";
import {
  finishReservation,
  InventoryConflict,
  reserveStock,
} from "@repo/product-db";
import { z } from "zod";

const reservationSchema = z.object({
  id: z.string().min(1).max(200),
  userId: z.string().min(1).max(200),
  expiresAt: z.number().int().positive(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        selectedSize: z.string().min(1).max(100),
        selectedColor: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(9900),
      }),
    )
    .min(1)
    .max(100),
});
export const inventoryRoutes = createServiceRouter();
inventoryRoutes.use("*", async (c, next) => {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  const supplied = c.req.header("x-internal-service-token");
  if (!expected || expected.length < 32)
    return c.json({ error: "Service authentication is not configured." }, 503);
  if (
    !supplied ||
    Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return c.json({ error: "Unauthorized" }, 401);
  return next();
});
inventoryRoutes.post("/reserve", async (c) => {
  const parsed = reservationSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return c.json({ error: "Invalid reservation." }, 400);
  try {
    const { id, userId, items, expiresAt } = parsed.data;
    await reserveStock(id, userId, items, expiresAt);
    return c.json({ success: true });
  } catch (error) {
    if (!(error instanceof InventoryConflict))
      return c.json({ error: "Inventory storage is unavailable." }, 503);
    return c.json(
      { error: "Stock is unavailable or the checkout has expired." },
      409,
    );
  }
});
inventoryRoutes.post("/:action", async (c) => {
  const action = c.req.param("action");
  const parsed = z
    .object({ id: z.string().min(1).max(200) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || (action !== "commit" && action !== "release"))
    return c.json({ error: "Invalid reservation action." }, 400);
  try {
    await finishReservation(
      parsed.data.id,
      action === "commit" ? "committed" : "released",
    );
    return c.json({ success: true });
  } catch (error) {
    if (!(error instanceof InventoryConflict))
      return c.json({ error: "Inventory storage is unavailable." }, 503);
    return c.json({ error: "Reservation cannot be finalized." }, 409);
  }
});
