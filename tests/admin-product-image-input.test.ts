import { describe, expect, test } from "bun:test";
import { parseProductImageInput } from "../apps/admin/src/lib/product-image-input";

describe("admin product image input", () => {
  test("uses one URL for every selected color", () => {
    expect(
      parseProductImageInput("https://cdn.example.com/product.webp?version=2", [
        "black",
        "white",
      ]),
    ).toEqual({
      black: "https://cdn.example.com/product.webp?version=2",
      white: "https://cdn.example.com/product.webp?version=2",
    });
  });

  test("accepts ordered paths and common mapping formats", () => {
    expect(
      parseProductImageInput("/products/black.jpg\n/products/white.avif", [
        "black",
        "white",
      ]),
    ).toEqual({
      black: "/products/black.jpg",
      white: "/products/white.avif",
    });

    expect(
      parseProductImageInput(
        "black=https://cdn.example.com/black.png\nwhite: /products/white.gif",
        ["black", "white"],
      ),
    ).toEqual({
      black: "https://cdn.example.com/black.png",
      white: "/products/white.gif",
    });
  });

  test("accepts a JSON color map", () => {
    expect(
      parseProductImageInput(
        '{"black":"/products/black.png","white":"https://cdn.example.com/white.jpeg"}',
        ["black", "white"],
      ),
    ).toEqual({
      black: "/products/black.png",
      white: "https://cdn.example.com/white.jpeg",
    });
  });

  test("rejects unsafe URLs and mismatched ordered inputs", () => {
    expect(() =>
      parseProductImageInput("javascript:alert(1)", ["black"]),
    ).toThrow("Invalid image mapping");
    expect(() =>
      parseProductImageInput("/one.png\n/two.webp", ["black"]),
    ).toThrow("one URL per color");
  });
});
