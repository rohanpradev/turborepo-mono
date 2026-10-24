import { expect, test } from "bun:test";
import {
  checkoutAttempt,
  consumeCheckout,
  createCheckoutStorage,
  rememberCheckout,
} from "../apps/client/src/lib/checkout-session";
import type { CartItem } from "../packages/types/src";

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

test("lazy browser storage preserves retries and consumes a matching paid checkout", () => {
  const store = storage();
  const accessStorage = () => store;
  const first = checkoutAttempt(accessStorage, "buyer", cart, 0);
  expect(checkoutAttempt(accessStorage, "buyer", cart, 1000)).toBe(first);
  rememberCheckout(accessStorage, "cs_lazy", "buyer", cart);
  expect(consumeCheckout(accessStorage, "cs_lazy", "buyer", cart)).toBe(true);
});

test("a denied browser storage getter cannot interrupt checkout or payment verification", () => {
  const accessStorage = () => {
    throw new DOMException("Storage access is denied.", "SecurityError");
  };
  expect(checkoutAttempt(accessStorage, "buyer", cart)).toBeString();
  expect(() =>
    rememberCheckout(accessStorage, "cs_denied", "buyer", cart),
  ).not.toThrow();
  expect(consumeCheckout(accessStorage, "cs_denied", "buyer", cart)).toBe(
    false,
  );
});

for (const failure of ["getter", "read", "write"] as const) {
  test(`checkout retries keep their identity when the storage ${failure} fails`, () => {
    const persistedStorage = storage();
    const checkoutStorage = createCheckoutStorage(() => {
      if (failure === "getter") throw new Error("Storage access denied.");
      return {
        ...persistedStorage,
        getItem: (key: string) => {
          if (failure === "read") throw new Error("Storage read denied.");
          return persistedStorage.getItem(key);
        },
        setItem: (key: string, value: string) => {
          if (failure === "write") throw new Error("Storage quota exceeded.");
          persistedStorage.setItem(key, value);
        },
      };
    });
    const first = checkoutAttempt(checkoutStorage, "buyer", cart, 0);
    expect(checkoutAttempt(checkoutStorage, "buyer", cart, 1000)).toBe(first);

    const changedCart = [{ ...cart[0], quantity: 2 }] as CartItem[];
    const changed = checkoutAttempt(
      checkoutStorage,
      "buyer",
      changedCart,
      1000,
    );
    expect(changed).not.toBe(first);
    expect(checkoutAttempt(checkoutStorage, "buyer", changedCart, 2000)).toBe(
      changed,
    );
    expect(
      checkoutAttempt(checkoutStorage, "other", changedCart, 2000),
    ).not.toBe(changed);
    expect(
      checkoutAttempt(checkoutStorage, "buyer", changedCart, 3601001),
    ).not.toBe(changed);
  });
}

test("a fresh checkout adapter reuses a normally persisted attempt after refresh", () => {
  const persistedStorage = storage();
  const first = checkoutAttempt(
    createCheckoutStorage(persistedStorage),
    "buyer",
    cart,
    0,
  );
  const afterRefresh = checkoutAttempt(
    createCheckoutStorage(persistedStorage),
    "buyer",
    cart,
    1000,
  );
  expect(afterRefresh).toBe(first);
});

test("a failed write cannot revive a stale persisted attempt for a previous cart", () => {
  const persistedStorage = storage();
  checkoutAttempt(persistedStorage, "buyer", cart, 0);
  const checkoutStorage = createCheckoutStorage({
    ...persistedStorage,
    setItem: () => {
      throw new Error("Storage quota exceeded.");
    },
  });
  const changedCart = [{ ...cart[0], quantity: 2 }] as CartItem[];
  const changed = checkoutAttempt(checkoutStorage, "buyer", changedCart, 1000);
  expect(checkoutAttempt(checkoutStorage, "buyer", changedCart, 2000)).toBe(
    changed,
  );
});
