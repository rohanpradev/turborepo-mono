import {
  cartItemSchema,
  MAX_CART_ITEM_QUANTITY,
  MAX_CHECKOUT_LINE_ITEMS,
} from "@repo/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartStoreActionsType, CartStoreStateType } from "@/types";

const isSameCartItem = (
  left: CartStoreStateType["cart"][number],
  right: CartStoreStateType["cart"][number],
) =>
  left.id === right.id &&
  left.selectedSize === right.selectedSize &&
  left.selectedColor === right.selectedColor;

const clampQuantity = (quantity: number) =>
  Math.min(
    MAX_CART_ITEM_QUANTITY,
    Math.max(1, Math.trunc(Number.isFinite(quantity) ? quantity : 1)),
  );

const persistedCartSchema = cartItemSchema.array().max(MAX_CHECKOUT_LINE_ITEMS);

const useCartStore = create<CartStoreStateType & CartStoreActionsType>()(
  persist(
    (set) => ({
      cart: [],
      hasHydrated: false,
      addToCart: (product) => {
        if (!cartItemSchema.safeParse(product).success) return false;
        let added = false;
        set((state) => {
          const existingIndex = state.cart.findIndex((item) =>
            isSameCartItem(item, product),
          );
          const existing = state.cart[existingIndex];
          if (existing) {
            const quantity = existing.quantity + product.quantity;
            if (quantity > MAX_CART_ITEM_QUANTITY) return state;
            added = true;
            return {
              cart: state.cart.map((item, index) =>
                index === existingIndex ? { ...item, quantity } : item,
              ),
            };
          }
          if (state.cart.length >= MAX_CHECKOUT_LINE_ITEMS) return state;
          added = true;
          return { cart: [...state.cart, { ...product }] };
        });
        return added;
      },
      removeFromCart: (product) =>
        set((state) => ({
          cart: state.cart.filter((item) => !isSameCartItem(item, product)),
        })),
      setCartItemQuantity: (product, quantity) =>
        set((state) => ({
          cart:
            quantity <= 0
              ? state.cart.filter((item) => !isSameCartItem(item, product))
              : state.cart.map((item) =>
                  isSameCartItem(item, product)
                    ? { ...item, quantity: clampQuantity(quantity) }
                    : item,
                ),
        })),
      clearCart: () => set({ cart: [] }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cart: state.cart }),
      merge: (persistedState, currentState) => {
        const persistedCart = (
          persistedState as Partial<CartStoreStateType> | null
        )?.cart;
        const parsedCart = persistedCartSchema.safeParse(persistedCart);

        return {
          ...currentState,
          cart: parsedCart.success ? parsedCart.data : [],
        };
      },
      onRehydrateStorage: (state) => () => state.setHasHydrated(true),
    },
  ),
);

export default useCartStore;
