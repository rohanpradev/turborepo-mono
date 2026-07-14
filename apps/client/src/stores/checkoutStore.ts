import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type ShippingFormInputs, shippingFormSchema } from "@/types";

type CheckoutState = {
  hasHydrated: boolean;
  shippingForm?: ShippingFormInputs;
  clearShippingForm: () => void;
  setShippingForm: (shippingForm: ShippingFormInputs) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

const getCheckoutSessionStorage = () => {
  try {
    // Remove delivery details written by the previous persistent store.
    localStorage.removeItem("checkout");
  } catch {
    // Storage can be unavailable in hardened browsing contexts.
  }

  return sessionStorage;
};

const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      shippingForm: undefined,
      clearShippingForm: () => set({ shippingForm: undefined }),
      setShippingForm: (shippingForm) => set({ shippingForm }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "checkout-session-v1",
      storage: createJSONStorage(getCheckoutSessionStorage),
      partialize: (state) => ({ shippingForm: state.shippingForm }),
      merge: (persistedState, currentState) => {
        const persistedShippingForm = (persistedState as Partial<CheckoutState>)
          .shippingForm;
        const parsedShippingForm = shippingFormSchema.safeParse(
          persistedShippingForm,
        );

        return {
          ...currentState,
          shippingForm: parsedShippingForm.success
            ? parsedShippingForm.data
            : undefined,
        };
      },
      onRehydrateStorage: (state) => () => state.setHasHydrated(true),
    },
  ),
);

export default useCheckoutStore;
