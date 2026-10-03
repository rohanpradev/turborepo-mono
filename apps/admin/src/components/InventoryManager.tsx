"use client";
import { useAuth } from "@clerk/nextjs";
import {
  getProductServiceUrl,
  listProductStock,
  setProductStock,
} from "@repo/api-client";
import type { ProductRecord } from "@repo/types";
import { useState } from "react";
import { Button } from "./ui/button";

export default function InventoryManager({
  product,
}: {
  product: ProductRecord;
}) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState(product.colors[0] ?? "");
  const [quantity, setQuantity] = useState(0);
  const [rows, setRows] = useState<
    Array<{ size: string; color: string; onHand: number; reserved: number }>
  >([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const token = await getToken();
    if (!token) throw new Error("Sign in again to manage stock.");
    setRows(
      (await listProductStock(getProductServiceUrl(), product.id, token)).data,
    );
  };
  return (
    <div className="space-y-3 md:col-span-3">
      <Button
        variant="outline"
        onClick={() => {
          setOpen(!open);
          if (!open)
            void load().catch(() => setMessage("Stock could not be loaded."));
        }}
      >
        Manage stock
      </Button>
      {open && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              const token = await getToken();
              if (!token) throw new Error("Sign in again.");
              await setProductStock(
                getProductServiceUrl(),
                { id: product.id, size, color, onHand: quantity },
                token,
              );
              await load();
              setMessage("Stock updated.");
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Stock update failed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Size
            <select
              className="block rounded border p-2"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            >
              {product.sizes.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Color
            <select
              className="block rounded border p-2"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            >
              {product.colors.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Units on hand
            <input
              className="block w-32 rounded border p-2"
              type="number"
              min="0"
              max="1000000"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <Button disabled={busy} type="submit">
            {busy ? "Saving…" : "Set stock"}
          </Button>
          <p className="w-full text-sm">
            Current:{" "}
            {rows.find((r) => r.size === size && r.color === color)?.onHand ??
              0}{" "}
            on hand,{" "}
            {rows.find((r) => r.size === size && r.color === color)?.reserved ??
              0}{" "}
            reserved. Enter the total on-hand count, including reserved units.
          </p>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
