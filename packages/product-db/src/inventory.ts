import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

export class InventoryConflict extends Error {}

export type StockItem = {
  productId: number;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
};
let pool: Pool | undefined;
const inventoryPool = () => {
  if (!pool) {
    if (!process.env.DATABASE_URL)
      throw new Error("DATABASE_URL is required for inventory.");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
    });
    pool.on("error", () =>
      console.error("Inventory database connection failed."),
    );
  }
  return pool;
};

export const migrateInventory = async () => {
  const connection = await inventoryPool().connect();
  try {
    await connection.query("BEGIN");
    await connection.query("SELECT pg_advisory_xact_lock(7021003)");
    await connection.query("CREATE SCHEMA IF NOT EXISTS inventory");
    await connection.query(
      "CREATE TABLE IF NOT EXISTS inventory.migration (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const sql = await readFile(
      new URL("./001-inventory.sql", import.meta.url),
      "utf8",
    );
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previous = await connection.query<{ checksum: string }>(
      "SELECT checksum FROM inventory.migration WHERE version='001'",
    );
    if (previous.rows[0] && previous.rows[0].checksum !== checksum)
      throw new Error(
        "Applied inventory migration checksum changed. Add a new migration instead.",
      );
    if (!previous.rows.length) {
      await connection.query(sql);
      await connection.query(
        "INSERT INTO inventory.migration(version,checksum) VALUES('001',$1)",
        [checksum],
      );
    }
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
};

export const checkInventory = async () => {
  await inventoryPool().query("SELECT id FROM inventory.reservation LIMIT 0");
};
export const closeInventory = async () => {
  await pool?.end();
  pool = undefined;
};

export const listStock = async (productId: number) => {
  const result = await inventoryPool().query<{
    size: string;
    color: string;
    onHand: number;
    reserved: number;
  }>(
    `SELECT size,color,on_hand AS "onHand",reserved FROM inventory.stock WHERE product_id=$1 ORDER BY size,color`,
    [productId],
  );
  return result.rows;
};

export const setStock = async (
  productId: number,
  size: string,
  color: string,
  onHand: number,
  actorId: string,
) => {
  if (!Number.isSafeInteger(onHand) || onHand < 0 || !actorId)
    throw new Error("Invalid stock update.");
  const connection = await inventoryPool().connect();
  try {
    await connection.query("BEGIN");
    const result = await connection.query(
      `INSERT INTO inventory.stock(product_id,size,color,on_hand) VALUES($1,$2,$3,$4)
      ON CONFLICT(product_id,size,color) DO UPDATE SET on_hand=$4 WHERE inventory.stock.reserved<=$4 RETURNING product_id`,
      [productId, size, color, onHand],
    );
    if (result.rowCount !== 1)
      throw new InventoryConflict(
        "Stock cannot be reduced below reserved units.",
      );
    await connection.query(
      "INSERT INTO inventory.stock_audit(product_id,size,color,on_hand,actor_id) VALUES($1,$2,$3,$4,$5)",
      [productId, size, color, onHand, actorId],
    );
    if (onHand === 0)
      await connection.query(
        "DELETE FROM inventory.stock WHERE product_id=$1 AND size=$2 AND color=$3 AND reserved=0 AND on_hand=0",
        [productId, size, color],
      );
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
};

// Sort and merge variants so competing carts acquire row locks in the same order.
const normalizeStockItems = (items: StockItem[]) => {
  const merged = new Map<string, StockItem>();
  for (const item of items) {
    const key = JSON.stringify([
      item.productId,
      item.selectedSize,
      item.selectedColor,
    ]);
    const previous = merged.get(key);
    merged.set(key, {
      ...item,
      quantity: (previous?.quantity ?? 0) + item.quantity,
    });
  }
  return [...merged.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, item]) => item);
};

export const reserveStock = async (
  id: string,
  userId: string,
  input: StockItem[],
  expiresAt: number,
) => {
  if (
    !input.length ||
    input.some(
      (item) =>
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        !Number.isSafeInteger(item.productId) ||
        item.productId < 1,
    )
  )
    throw new InventoryConflict("Invalid inventory items.");
  const items = normalizeStockItems(input);
  const connection = await inventoryPool().connect();
  try {
    await connection.query("BEGIN");
    await connection.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
      [id],
    );
    const existing = await connection.query<{
      user_id: string;
      items: StockItem[];
      state: string;
    }>("SELECT * FROM inventory.reservation WHERE id=$1 FOR UPDATE", [id]);
    const reservation = existing.rows[0];
    if (reservation) {
      if (
        reservation.user_id !== userId ||
        JSON.stringify(
          normalizeStockItems(reservation.items).map((i) => [
            i.productId,
            i.selectedSize,
            i.selectedColor,
            i.quantity,
          ]),
        ) !==
          JSON.stringify(
            items.map((i) => [
              i.productId,
              i.selectedSize,
              i.selectedColor,
              i.quantity,
            ]),
          ) ||
        reservation.state === "released"
      )
        throw new InventoryConflict(
          "Reservation conflict or expired checkout.",
        );
    } else {
      if (expiresAt <= Date.now() || expiresAt > Date.now() + 65 * 60 * 1000)
        throw new InventoryConflict("Invalid reservation expiry.");
      for (const item of items) {
        const result = await connection.query(
          "UPDATE inventory.stock SET reserved=reserved+$4 WHERE product_id=$1 AND size=$2 AND color=$3 AND on_hand-reserved>=$4",
          [
            item.productId,
            item.selectedSize,
            item.selectedColor,
            item.quantity,
          ],
        );
        if (result.rowCount !== 1)
          throw new InventoryConflict(
            "The selected variant has insufficient stock.",
          );
      }
      await connection.query(
        "INSERT INTO inventory.reservation(id,user_id,items,expires_at,state) VALUES($1,$2,$3,to_timestamp($4/1000.0),'reserved')",
        [id, userId, JSON.stringify(items), expiresAt],
      );
    }
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
};

export const finishReservation = async (
  id: string,
  state: "committed" | "released",
) => {
  const connection = await inventoryPool().connect();
  try {
    await connection.query("BEGIN");
    await connection.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
      [id],
    );
    const result = await connection.query<{
      items: StockItem[];
      state: string;
    }>("SELECT items,state FROM inventory.reservation WHERE id=$1 FOR UPDATE", [
      id,
    ]);
    const reservation = result.rows[0];
    if (!reservation) {
      if (state === "released") {
        await connection.query("COMMIT");
        return;
      }
      throw new InventoryConflict("Reservation not found.");
    }
    if (reservation.state !== state) {
      if (reservation.state !== "reserved")
        throw new Error(
          "Reservation already finalized with a different outcome.",
        );
      for (const item of normalizeStockItems(reservation.items)) {
        await connection.query(
          "UPDATE inventory.stock SET reserved=reserved-$4,on_hand=on_hand-$5 WHERE product_id=$1 AND size=$2 AND color=$3",
          [
            item.productId,
            item.selectedSize,
            item.selectedColor,
            item.quantity,
            state === "committed" ? item.quantity : 0,
          ],
        );
      }
      await connection.query(
        "UPDATE inventory.reservation SET state=$2,updated_at=now() WHERE id=$1",
        [id, state],
      );
    }
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
};
