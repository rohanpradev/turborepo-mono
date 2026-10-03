import type { CartItem } from "@repo/types";

type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const cartSignature = (cart: CartItem[]) =>
  JSON.stringify(
    cart
      .map(({ id, quantity, selectedSize, selectedColor }) => ({
        id,
        quantity,
        selectedSize,
        selectedColor,
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  );

// Only identifiers and a cart signature are retained; never a client secret or address.
export function checkoutAttempt(
  storage: StoragePort,
  userId: string,
  cart: CartItem[],
  now = Date.now(),
) {
  const key = `checkout-attempt:${userId}`;
  const signature = cartSignature(cart);
  try {
    const saved = JSON.parse(storage.getItem(key) ?? "null");
    if (
      saved?.signature === signature &&
      typeof saved.id === "string" &&
      saved.expiresAt > now
    )
      return saved.id as string;
  } catch {
    /* Corrupt or unavailable browser storage starts a fresh attempt. */
  }
  const id = crypto.randomUUID();
  try {
    storage.setItem(
      key,
      JSON.stringify({ id, signature, expiresAt: now + 60 * 60 * 1000 }),
    );
  } catch {
    /* Checkout still works without persistence. */
  }
  return id;
}
export function rememberCheckout(
  storage: StoragePort,
  sessionId: string,
  userId: string,
  cart: CartItem[],
) {
  try {
    storage.setItem(
      `checkout-return:${sessionId}`,
      JSON.stringify({ userId, signature: cartSignature(cart) }),
    );
  } catch {
    /* Preserve the cart if storage is unavailable. */
  }
}
export function consumeCheckout(
  storage: StoragePort,
  sessionId: string,
  userId: string,
  cart: CartItem[],
) {
  const key = `checkout-return:${sessionId}`;
  try {
    const saved = JSON.parse(storage.getItem(key) ?? "null");
    if (saved?.userId !== userId) return false;
    storage.removeItem(key);
    // Do not remove additions made while a different checkout was in progress.
    if (saved.signature !== cartSignature(cart)) return false;
    storage.removeItem(`checkout-attempt:${userId}`);
    return true;
  } catch {
    return false;
  }
}
