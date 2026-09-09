import { describe, expect, it } from "bun:test";
import { buildProductPayload } from "../apps/admin/src/lib/product-form";

const form = {
  name: " Everyday shirt ",
  categorySlug: "shirts",
  colors: "black, white",
  sizes: "s, m",
  description: "Soft cotton shirt.",
  shortDescription: "Made for everyday wear.",
  price: "74.90",
  images: "/products/shirt.png",
};

describe("admin product form", () => {
  it("converts dollars to integer cents and applies shared product validation", () => {
    expect(buildProductPayload(form)).toMatchObject({
      name: "Everyday shirt",
      price: 7490,
      sizes: ["s", "m"],
      images: { black: "/products/shirt.png", white: "/products/shirt.png" },
    });
    expect(buildProductPayload({ ...form, price: "0.29" }).price).toBe(29);
  });
  it.each(["", " ", "-1", "1.001", "Infinity", "1e3", "1000000"])(
    "rejects invalid or unrepresentable price %s",
    (price) => {
      expect(() => buildProductPayload({ ...form, price })).toThrow();
    },
  );
  it("rejects empty variants and whitespace-only required fields before sending", () => {
    expect(() => buildProductPayload({ ...form, colors: ", ," })).toThrow();
    expect(() => buildProductPayload({ ...form, sizes: ", ," })).toThrow();
    expect(() => buildProductPayload({ ...form, name: " " })).toThrow();
  });
});
