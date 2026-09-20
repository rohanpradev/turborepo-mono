import { describe, expect, it } from "bun:test";
import {
  MAX_CART_ITEM_QUANTITY,
  MAX_CHECKOUT_LINE_ITEMS,
} from "../packages/types/src/index";

const createMemoryStorage = () => {
  const values = new Map<string, string>();

  return {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  } satisfies Storage;
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: createMemoryStorage(),
});
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: createMemoryStorage(),
});

const [{ default: useCartStore }, { default: useCheckoutStore }] =
  await Promise.all([
    import("../apps/client/src/stores/cartStore"),
    import("../apps/client/src/stores/checkoutStore"),
  ]);

describe("checkout store hydration", () => {
  it("recovers from null persisted cart and checkout state", async () => {
    localStorage.setItem("cart", JSON.stringify({ state: null, version: 0 }));
    await useCartStore.persist.rehydrate();
    expect(useCartStore.getState().cart).toEqual([]);
    expect(useCartStore.getState().hasHydrated).toBe(true);
    sessionStorage.setItem(
      "checkout-session-v1",
      JSON.stringify({ state: null, version: 0 }),
    );
    await useCheckoutStore.persist.rehydrate();
    expect(useCheckoutStore.getState().shippingForm).toBeUndefined();
    expect(useCheckoutStore.getState().hasHydrated).toBe(true);
  });

  it("reactively marks the cart store as hydrated", async () => {
    useCartStore.getState().setHasHydrated(false);
    const hydrationStates: Array<boolean> = [];
    const unsubscribe = useCartStore.subscribe((state) => {
      hydrationStates.push(state.hasHydrated);
    });

    await useCartStore.persist.rehydrate();
    unsubscribe();

    expect(useCartStore.getState().hasHydrated).toBe(true);
    expect(hydrationStates).toContain(true);
  });

  it("reactively marks checkout details as hydrated", async () => {
    useCheckoutStore.getState().setHasHydrated(false);
    const hydrationStates: Array<boolean> = [];
    const unsubscribe = useCheckoutStore.subscribe((state) => {
      hydrationStates.push(state.hasHydrated);
    });

    await useCheckoutStore.persist.rehydrate();
    unsubscribe();

    expect(useCheckoutStore.getState().hasHydrated).toBe(true);
    expect(hydrationStates).toContain(true);
  });
});

const cartItem = {
  id: 1,
  name: "Everyday tee",
  shortDescription: "Cotton tee",
  description: "Cotton tee",
  price: 3500,
  categorySlug: "t-shirts",
  sizes: ["m"],
  colors: ["black"],
  images: { black: "/products/1b.png" },
  selectedSize: "m",
  selectedColor: "black",
  quantity: 1,
};

describe("cart addition results", () => {
  it("rejects an addition exceeding quantity limits without partially adding", () => {
    useCartStore.setState({
      cart: [{ ...cartItem, quantity: MAX_CART_ITEM_QUANTITY - 1 }],
    });
    expect(
      useCartStore.getState().addToCart({ ...cartItem, quantity: 2 }),
    ).toBe(false);
    expect(useCartStore.getState().cart[0]?.quantity).toBe(
      MAX_CART_ITEM_QUANTITY - 1,
    );
    expect(useCartStore.getState().addToCart(cartItem)).toBe(true);
    expect(useCartStore.getState().cart[0]?.quantity).toBe(
      MAX_CART_ITEM_QUANTITY,
    );
    expect(useCartStore.getState().addToCart(cartItem)).toBe(false);
    useCartStore.getState().clearCart();
  });

  it("rejects new lines at capacity while allowing an existing line to increase", () => {
    useCartStore.setState({
      cart: Array.from({ length: MAX_CHECKOUT_LINE_ITEMS }, (_, index) => ({
        ...cartItem,
        id: index + 1,
      })),
    });
    expect(
      useCartStore
        .getState()
        .addToCart({ ...cartItem, id: MAX_CHECKOUT_LINE_ITEMS + 1 }),
    ).toBe(false);
    expect(useCartStore.getState().cart).toHaveLength(MAX_CHECKOUT_LINE_ITEMS);
    expect(useCartStore.getState().addToCart(cartItem)).toBe(true);
    expect(useCartStore.getState().cart[0]?.quantity).toBe(2);
    useCartStore.getState().clearCart();
  });

  it("rejects invalid quantities instead of claiming a successful addition", () => {
    useCartStore.getState().clearCart();
    expect(
      useCartStore.getState().addToCart({ ...cartItem, quantity: 0 }),
    ).toBe(false);
    expect(
      useCartStore.getState().addToCart({ ...cartItem, quantity: 1.5 }),
    ).toBe(false);
    expect(useCartStore.getState().cart).toEqual([]);
  });
});
