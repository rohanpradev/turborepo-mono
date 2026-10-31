"use client";

import { useAuth } from "@clerk/nextjs";
import {
  getProductServiceUrl,
  listProductStock,
  setProductStock,
} from "@repo/api-client";
import type { ProductRecord } from "@repo/types";
import { useRef, useState } from "react";
import { Button } from "./ui/button";

type StockRows = Awaited<ReturnType<typeof listProductStock>>["data"];

export default function InventoryManager({
  product,
}: {
  product: ProductRecord;
}) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState(product.colors[0] ?? "");
  const [draftQuantity, setDraftQuantity] = useState<{
    productId: number;
    size: string;
    color: string;
    value: string;
  } | null>(null);
  const [rows, setRows] = useState<StockRows | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const mutationInFlight = useRef(false);
  const selectedSize = product.sizes.includes(size)
    ? size
    : (product.sizes[0] ?? "");
  const selectedColor = product.colors.includes(color)
    ? color
    : (product.colors[0] ?? "");
  const selectedStock = rows?.find(
    (row) => row.size === selectedSize && row.color === selectedColor,
  );
  const quantity =
    draftQuantity?.productId === product.id &&
    draftQuantity?.size === selectedSize &&
    draftQuantity.color === selectedColor
      ? draftQuantity.value
      : String(selectedStock?.onHand ?? 5);
  const retiredRows =
    rows?.filter(
      (row) =>
        !product.sizes.includes(row.size) ||
        !product.colors.includes(row.color),
    ) ?? [];

  const load = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in again to manage stock.");
      const response = await listProductStock(
        getProductServiceUrl(),
        product.id,
        token,
      );
      setRows(response.data);
      setDraftQuantity(null);
    } catch (error) {
      // Unknown inventory must never appear as a confirmed zero-stock count.
      setRows(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshStock = async () => {
    setMessage("");
    try {
      await load();
    } catch {
      setMessage("Stock could not be loaded. Try loading it again.");
    }
  };

  const saveStock = async (
    stockSize: string,
    stockColor: string,
    onHand: number,
  ) => {
    if (mutationInFlight.current || loading || !rows) return;
    mutationInFlight.current = true;
    setBusy(true);
    setMessage("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in again to manage stock.");
      await setProductStock(
        getProductServiceUrl(),
        { id: product.id, size: stockSize, color: stockColor, onHand },
        token,
      );
      try {
        await load();
        setMessage("Stock updated.");
      } catch {
        setMessage(
          "Stock was updated, but the latest counts could not be loaded. Load stock again before making another change.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Stock update failed.",
      );
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 md:col-span-3">
      <Button
        type="button"
        variant="outline"
        disabled={busy || loading}
        aria-expanded={open}
        aria-controls={`inventory-${product.id}`}
        onClick={() => {
          setOpen(!open);
          if (!open) void refreshStock();
        }}
      >
        {open ? "Hide stock" : "Manage stock"}
      </Button>
      {open && (
        <div id={`inventory-${product.id}`} className="space-y-4">
          {loading && <p role="status">Loading stock…</p>}
          {!loading && !rows && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void refreshStock()}
            >
              Load stock again
            </Button>
          )}
          <form
            aria-busy={busy || loading}
            onSubmit={(event) => {
              event.preventDefault();
              void saveStock(selectedSize, selectedColor, Number(quantity));
            }}
          >
            <fieldset
              disabled={busy || loading || !rows}
              className="flex flex-wrap items-end gap-3 disabled:opacity-60"
            >
              <legend className="sr-only">Current product variant stock</legend>
              <label>
                Size
                <select
                  className="block rounded border p-2"
                  value={selectedSize}
                  onChange={(event) => {
                    setSize(event.target.value);
                    setDraftQuantity(null);
                  }}
                >
                  {product.sizes.map((stockSize) => (
                    <option key={stockSize}>{stockSize}</option>
                  ))}
                </select>
              </label>
              <label>
                Color
                <select
                  className="block rounded border p-2"
                  value={selectedColor}
                  onChange={(event) => {
                    setColor(event.target.value);
                    setDraftQuantity(null);
                  }}
                >
                  {product.colors.map((stockColor) => (
                    <option key={stockColor}>{stockColor}</option>
                  ))}
                </select>
              </label>
              <label>
                Units on hand
                <input
                  className="block w-32 rounded border p-2"
                  type="number"
                  min={selectedStock?.reserved ?? 0}
                  max="1000000"
                  step="1"
                  required
                  value={rows ? quantity : ""}
                  onChange={(event) =>
                    setDraftQuantity({
                      productId: product.id,
                      size: selectedSize,
                      color: selectedColor,
                      value: event.target.value,
                    })
                  }
                />
              </label>
              <Button type="submit">{busy ? "Saving…" : "Set stock"}</Button>
              {rows && (
                <p className="w-full text-sm">
                  Current: {selectedStock?.onHand ?? 0} on hand,{" "}
                  {selectedStock?.reserved ?? 0} reserved. Enter the total
                  on-hand count, including reserved units.
                </p>
              )}
            </fieldset>
          </form>
          {retiredRows.length > 0 && (
            <section
              className="space-y-3 rounded-lg border p-4"
              aria-label="Retired variant stock"
            >
              <h3 className="font-medium">Retired variants</h3>
              <p className="text-sm text-muted-foreground">
                These sizes or colors were removed from the catalog. Clear their
                remaining stock before deleting the product. Reserved units must
                be resolved first.
              </p>
              <ul className="space-y-3">
                {retiredRows.map((row) => (
                  <li
                    key={JSON.stringify([row.size, row.color])}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <span className="text-sm">
                      {row.size} / {row.color}: {row.onHand} on hand,{" "}
                      {row.reserved} reserved
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy || loading || row.reserved > 0}
                      aria-label={`Clear stock for retired ${row.size} / ${row.color}`}
                      onClick={() => void saveStock(row.size, row.color, 0)}
                    >
                      {row.reserved > 0 ? "Reserved stock held" : "Clear stock"}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
