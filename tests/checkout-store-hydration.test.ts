import { describe, expect, it } from "bun:test";

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
