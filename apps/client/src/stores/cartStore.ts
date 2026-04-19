import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartStoreActionsType, CartStoreStateType } from "@/types";

const useCartStore = create<CartStoreStateType & CartStoreActionsType>()(
  persist(
    (set) => ({
      cart: [],
      hasHydrated: false,
      addToCart: (product) =>
        set((state) => {
          const existingIndex = state.cart.findIndex(
            (p) =>
              p.id === product.id &&
              p.selectedSize === product.selectedSize &&
              p.selectedColor === product.selectedColor,
          );

          if (existingIndex !== -1) {
            const updatedCart = [...state.cart];
            const existingProduct = updatedCart[existingIndex];

            if (!existingProduct) {
              return state;
            }

            existingProduct.quantity += product.quantity || 1;
            return { cart: updatedCart };
          }

          return {
            cart: [
              ...state.cart,
              {
                ...product,
                quantity: product.quantity || 1,
                selectedSize: product.selectedSize,
                selectedColor: product.selectedColor,
              },
            ],
          };
        }),
      removeFromCart: (product) =>
        set((state) => ({
          cart: state.cart.filter(
            (p) =>
              !(
                p.id === product.id &&
                p.selectedSize === product.selectedSize &&
                p.selectedColor === product.selectedColor
              ),
          ),
        })),
      setCartItemQuantity: (product, quantity) =>
        set((state) => ({
          cart:
            quantity <= 0
              ? state.cart.filter(
                  (p) =>
                    !(
                      p.id === product.id &&
                      p.selectedSize === product.selectedSize &&
                      p.selectedColor === product.selectedColor
                    ),
                )
              : state.cart.map((p) =>
                  p.id === product.id &&
                  p.selectedSize === product.selectedSize &&
                  p.selectedColor === product.selectedColor
                    ? { ...p, quantity }
                    : p,
                ),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: "cart",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    },
  ),
);

export default useCartStore;
