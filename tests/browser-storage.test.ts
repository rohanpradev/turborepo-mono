import { describe, expect, it } from "bun:test";
import { createBrowserStorage } from "../apps/client/src/lib/browser-storage";

const createMemoryStorage = () => {
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

describe("browser storage fallback", () => {
  it("persists normally and observes changes from another browser context", () => {
    const native = createMemoryStorage();
    const storage = createBrowserStorage(() => native);
    storage.setItem("cart", "first cart");
    expect(native.getItem("cart")).toBe("first cart");
    native.setItem("cart", "updated elsewhere");
    expect(storage.getItem("cart")).toBe("updated elsewhere");
    storage.removeItem("cart");
    expect(native.getItem("cart")).toBeNull();
  });

  it("retains this visit's changes when the storage getter is denied", () => {
    const storage = createBrowserStorage(() => {
      throw new Error("Storage access denied");
    });
    expect(storage.getItem("cart")).toBeNull();
    storage.setItem("cart", "in-memory cart");
    expect(storage.getItem("cart")).toBe("in-memory cart");
    storage.removeItem("cart");
    expect(storage.getItem("cart")).toBeNull();
  });

  it("does not revive an old value when a quota failure still permits reads", () => {
    const native = createMemoryStorage();
    native.setItem("cart", "old cart");
    const storage = createBrowserStorage(() => ({
      ...native,
      setItem() {
        throw new Error("Storage quota exceeded");
      },
    }));
    expect(storage.getItem("cart")).toBe("old cart");
    storage.setItem("cart", "new cart");
    expect(native.getItem("cart")).toBe("old cart");
    expect(storage.getItem("cart")).toBe("new cart");
    storage.removeItem("cart");
    expect(storage.getItem("cart")).toBeNull();
  });

  it("does not restore removed delivery details when native removal fails", () => {
    const native = createMemoryStorage();
    native.setItem("checkout-session-v1", "delivery details");
    const storage = createBrowserStorage(() => ({
      ...native,
      removeItem() {
        throw new Error("Storage removal denied");
      },
    }));
    expect(storage.getItem("checkout-session-v1")).toBe("delivery details");
    storage.removeItem("checkout-session-v1");
    expect(storage.getItem("checkout-session-v1")).toBeNull();
  });

  it("retains the last readable value if storage access is later revoked", () => {
    const native = createMemoryStorage();
    native.setItem("cart", "saved cart");
    let denied = false;
    const storage = createBrowserStorage(() => ({
      ...native,
      getItem(key) {
        if (denied) throw new Error("Storage access revoked");
        return native.getItem(key);
      },
    }));
    expect(storage.getItem("cart")).toBe("saved cart");
    denied = true;
    expect(storage.getItem("cart")).toBe("saved cart");
    storage.setItem("cart", "current cart");
    expect(storage.getItem("cart")).toBe("current cart");
  });

  it("finishes Zustand hydration for both stores with blocked browser storage", async () => {
    const storefront = new URL("../apps/client/", import.meta.url).pathname;
    const child = Bun.spawn({
      cmd: [
        process.execPath,
        "--eval",
        `
          for (const name of ["localStorage", "sessionStorage"]) {
            Object.defineProperty(globalThis, name, {
              configurable: true,
              get() { throw new Error("Browser storage denied"); },
            });
          }
          const { default: cart } = await import("./src/stores/cartStore.ts");
          const { default: checkout } = await import("./src/stores/checkoutStore.ts");
          for (const store of [cart, checkout]) {
            if (!store.getState().hasHydrated) throw new Error("Initial hydration did not finish");
            store.getState().setHasHydrated(false);
            await store.persist.rehydrate();
            if (!store.getState().hasHydrated) throw new Error("Explicit hydration did not finish");
          }
          console.log("Blocked-storage hydration completed");
        `,
      ],
      cwd: storefront,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect({ code, stderr }).toEqual({ code: 0, stderr: "" });
    expect(stdout).toContain("Blocked-storage hydration completed");
  });
});
