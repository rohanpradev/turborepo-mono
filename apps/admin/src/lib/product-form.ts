import { type ProductPayload, productPayloadSchema } from "@repo/types";
import { parseProductImageInput } from "./product-image-input";

export type ProductFormState = {
  categorySlug: string;
  colors: string;
  description: string;
  images: string;
  name: string;
  price: string;
  shortDescription: string;
  sizes: string;
};

const parseCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const buildProductPayload = (form: ProductFormState): ProductPayload => {
  const colors = parseCsv(form.colors);
  const sizes = parseCsv(form.sizes);
  const images = parseProductImageInput(form.images, colors);
  const price = Math.round(Number(form.price) * 100);

  if (
    !/^\d+(?:\.\d{1,2})?$/.test(form.price.trim()) ||
    !Number.isSafeInteger(price) ||
    price < 0
  ) {
    throw new Error("Enter a valid product price.");
  }

  for (const color of colors) {
    if (!images[color]) {
      throw new Error(`Add an image for ${color}.`);
    }
  }

  const result = productPayloadSchema.safeParse({
    categorySlug: form.categorySlug.trim(),
    colors,
    description: form.description.trim(),
    images,
    name: form.name.trim(),
    price,
    shortDescription: form.shortDescription.trim(),
    sizes,
  });
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `${issue?.path.join(" ") || "Product"}: ${issue?.message ?? "Check your product details."}`,
    );
  }
  return result.data;
};
