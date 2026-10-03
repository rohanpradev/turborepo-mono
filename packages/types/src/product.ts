import z from "zod";
import type { CategoryRecord, ProductRecord } from "./api";

export type ProductType = ProductRecord;

export type ProductsType = ProductType[];

export type StripeProductType = {
  id: string;
  name: string;
  price: number;
};

export const colors = [
  "blue",
  "green",
  "red",
  "yellow",
  "purple",
  "orange",
  "pink",
  "brown",
  "gray",
  "black",
  "white",
] as const;

export const sizes = [
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
] as const;

export const ProductFormSchema = z
  .object({
    name: z
      .string({ error: "Product name is required!" })
      .min(1, { error: "Product name is required!" }),
    shortDescription: z
      .string({ error: "Short description is required!" })
      .min(1, { error: "Short description is required!" })
      .max(60),
    description: z
      .string({ error: "Description is required!" })
      .min(1, { error: "Description is required!" }),
    price: z
      .number({ error: "Price is required!" })
      .min(1, { error: "Price is required!" }),
    categorySlug: z
      .string({ error: "Category is required!" })
      .min(1, { error: "Category is required!" }),
    sizes: z
      .array(z.enum(sizes))
      .min(1, { error: "At least one size is required!" }),
    colors: z
      .array(z.enum(colors))
      .min(1, { error: "At least one color is required!" }),
    images: z.record(z.string(), z.string(), {
      error: "Image for each color is required!",
    }),
  })
  .refine(
    (data) => {
      const missingImages = data.colors.filter(
        (color: string) => !data.images?.[color],
      );
      return missingImages.length === 0;
    },
    {
      error: "Image is required for each selected color!",
      path: ["images"],
    },
  );

export type CategoryType = CategoryRecord;

export const CategoryFormSchema = z.object({
  name: z
    .string({ error: "Name is Required!" })
    .min(1, { error: "Name is Required!" }),
  slug: z
    .string({ error: "Slug is Required!" })
    .min(1, { error: "Slug is Required!" }),
});
