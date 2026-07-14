import z from "zod";
import type { CartItem } from "./api";

export type CartItemType = CartItem;

export type CartItemsType = CartItemType[];

export const shippingFormSchema = z.object({
  name: z.string().trim().min(1, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .min(1, "Enter a phone number.")
    .regex(/^[+()\d.\-\s]+$/, "Enter a valid phone number.")
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Phone number must contain between 7 and 15 digits."),
  address: z.string().trim().min(1, "Enter a street address."),
  city: z.string().trim().min(1, "Enter a city."),
});

export type ShippingFormInputs = z.infer<typeof shippingFormSchema>;

export type CartStoreStateType = {
  cart: CartItemsType;
  hasHydrated: boolean;
};

export type CartStoreActionsType = {
  addToCart: (product: CartItemType) => void;
  removeFromCart: (product: CartItemType) => void;
  setCartItemQuantity: (product: CartItemType, quantity: number) => void;
  clearCart: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};
