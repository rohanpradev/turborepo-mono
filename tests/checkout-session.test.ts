import { expect, test } from "bun:test";
import type { CartItem } from "@repo/types";
import {
  checkoutAttempt,
  consumeCheckout,
  rememberCheckout,
} from "../apps/client/src/lib/checkout-session";

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
};
const cart = [
  { id: 1, quantity: 1, selectedSize: "m", selectedColor: "black" },
] as CartItem[];
test("refresh and retry reuse the attempt, while changed cart, account, or expiry replace it", () => {
  const store = storage();
  const first = checkoutAttempt(store, "buyer", cart, 0);
  expect(checkoutAttempt(store, "buyer", cart, 1000)).toBe(first);
  expect(checkoutAttempt(store, "buyer", cart, 3600001)).not.toBe(first);
  expect(checkoutAttempt(store, "other", cart, 1000)).not.toBe(first);
  expect(
    checkoutAttempt(
      store,
      "buyer",
      [{ ...cart[0], quantity: 2 }] as CartItem[],
      1000,
    ),
  ).not.toBe(first);
});
test("old return URLs cannot clear new cart contents or another account's cart", () => {
  const store = storage();
  rememberCheckout(store, "cs_1", "buyer", cart);
  expect(consumeCheckout(store, "cs_1", "other", cart)).toBe(false);
  expect(
    consumeCheckout(store, "cs_1", "buyer", [
      { ...cart[0], quantity: 2 },
    ] as CartItem[]),
  ).toBe(false);
  rememberCheckout(store, "cs_2", "buyer", cart);
  expect(consumeCheckout(store, "cs_2", "buyer", cart)).toBe(true);
  expect(consumeCheckout(store, "cs_2", "buyer", cart)).toBe(false);
});
