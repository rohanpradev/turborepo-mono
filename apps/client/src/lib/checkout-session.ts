import type { CartItem } from "@repo/types";

type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
// Browser storage getters can themselves throw in restricted browsing contexts.
type StorageAccess = StoragePort | (() => StoragePort);
const resolveStorage = (storage: StorageAccess) =>
  typeof storage === "function" ? storage() : storage;

/** Keep this adapter for one mounted checkout so denied storage cannot change retry identity. */
export const createCheckoutStorage = (storage: StorageAccess): StoragePort => {
  const memory = new Map<string, string | null>();
  return {
    getItem(key) {
      if (memory.has(key)) return memory.get(key) ?? null;
      try {
        const value = resolveStorage(storage).getItem(key);
        memory.set(key, value);
        return value;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      // Keep the latest value even when an older persisted value remains readable
      // after a write fails, for example because the storage quota was exceeded.
      memory.set(key, value);
      try {
        resolveStorage(storage).setItem(key, value);
      } catch {
        /* This mounted checkout retains its in-memory identity. */
      }
    },
    removeItem(key) {
      memory.set(key, null);
      try {
        resolveStorage(storage).removeItem(key);
      } catch {
        /* A removed in-memory value must not be revived by a stale read. */
      }
    },
  };
};

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
  storage: StorageAccess,
  userId: string,
  cart: CartItem[],
  now = Date.now(),
) {
  const key = `checkout-attempt:${userId}`;
  const signature = cartSignature(cart);
  try {
    const saved = JSON.parse(resolveStorage(storage).getItem(key) ?? "null");
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
    resolveStorage(storage).setItem(
      key,
      JSON.stringify({ id, signature, expiresAt: now + 60 * 60 * 1000 }),
    );
  } catch {
    /* Checkout still works without persistence. */
  }
  return id;
}
export function rememberCheckout(
  storage: StorageAccess,
  sessionId: string,
  userId: string,
  cart: CartItem[],
) {
  try {
    resolveStorage(storage).setItem(
      `checkout-return:${sessionId}`,
      JSON.stringify({ userId, signature: cartSignature(cart) }),
    );
  } catch {
    /* Preserve the cart if storage is unavailable. */
  }
}
export function consumeCheckout(
  storage: StorageAccess,
  sessionId: string,
  userId: string,
  cart: CartItem[],
) {
  const key = `checkout-return:${sessionId}`;
  try {
    const resolvedStorage = resolveStorage(storage);
    const saved = JSON.parse(resolvedStorage.getItem(key) ?? "null");
    if (saved?.userId !== userId) return false;
    resolvedStorage.removeItem(key);
    // Do not remove additions made while a different checkout was in progress.
    if (saved.signature !== cartSignature(cart)) return false;
    resolvedStorage.removeItem(`checkout-attempt:${userId}`);
    return true;
  } catch {
    return false;
  }
}
