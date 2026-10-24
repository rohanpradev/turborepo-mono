import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { productRouter } from "../apps/product-service/src/rpc";
import { ProductService } from "../apps/product-service/src/services/ProductService";
import * as honoUtils from "../packages/hono-utils/src";
import * as inventory from "../packages/product-db/src/inventory";

const product = {
  id: 42,
  name: "Everyday tee",
  shortDescription: "Tee",
  description: "Tee",
  categorySlug: "tees",
  price: 1999,
  sizes: ["m"],
  colors: ["black"],
  images: { black: "/tee.png" },
};
const retired = { size: "s", color: "blue", onHand: 4, reserved: 0 };

const app = honoUtils.createServiceRouter();
app.use(
  "/rpc/product/*",
  honoUtils.createORPCMiddleware({
    context: (hono) => ({ hono }),
    prefix: "/rpc/product",
    router: productRouter,
  }),
);
const set = (size: string, color: string, onHand: number) =>
  app.request("http://product.test/rpc/product/inventory/set", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: { id: product.id, size, color, onHand } }),
  });

describe("inventory variant retirement", () => {
  const findProduct = spyOn(ProductService, "getProduct");
  const list = spyOn(inventory, "listStock");
  const write = spyOn(inventory, "setStock");
  const authorize = spyOn(honoUtils, "getAuthenticatedAdminUserId");
  beforeEach(() => {
    authorize.mockReturnValue("inventory-admin");
    findProduct.mockResolvedValue(product);
    list.mockResolvedValue([retired]);
    write.mockReset();
    write.mockResolvedValue();
  });
  afterAll(() => {
    findProduct.mockRestore();
    list.mockRestore();
    write.mockRestore();
    authorize.mockRestore();
  });

  test("an existing retired variant can be cleared", async () => {
    expect((await set("s", "blue", 0)).status).toBe(200);
    expect(write).toHaveBeenCalledWith(42, "s", "blue", 0, "inventory-admin");
  });
  test("retired variants cannot acquire new stock", async () => {
    const response = await set("s", "blue", 5);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      json: { code: "BAD_REQUEST" },
    });
    expect(write).not.toHaveBeenCalled();
  });
  test("clearing requires the exact persisted variant", async () => {
    expect((await set("s", "black", 0)).status).toBe(400);
    expect(write).not.toHaveBeenCalled();
  });
  test("held stock remains protected by the atomic storage guard", async () => {
    list.mockResolvedValue([{ ...retired, reserved: 2 }]);
    write.mockRejectedValue(new inventory.InventoryConflict("Stock is held."));
    expect((await set("s", "blue", 0)).status).toBe(409);
  });
  test("current variants retain their existing stock controls", async () => {
    expect((await set("m", "black", 5)).status).toBe(200);
    expect(write).toHaveBeenCalledWith(42, "m", "black", 5, "inventory-admin");
  });
  test("stock accepts the same variant length boundary as the catalog and checkout", async () => {
    const size = "s".repeat(500);
    const color = "c".repeat(500);
    findProduct.mockResolvedValue({
      ...product,
      sizes: [size],
      colors: [color],
    });
    expect((await set(size, color, 5)).status).toBe(200);
    expect(write).toHaveBeenCalledWith(42, size, color, 5, "inventory-admin");
    write.mockClear();
    expect((await set(`${size}s`, color, 5)).status).toBe(400);
    expect(write).not.toHaveBeenCalled();
  });
});
