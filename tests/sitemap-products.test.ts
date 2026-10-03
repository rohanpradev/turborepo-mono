import { describe, expect, test } from "bun:test";
import { loadSitemapProducts } from "../apps/client/src/lib/sitemap-products";
import type { ListProductsResponse } from "../packages/api-client/src";

const product = (id: number): ListProductsResponse["data"][number] => ({
  id,
  name: `Product ${id}`,
  shortDescription: "Test product",
  description: "Test product description",
  categorySlug: "test",
  price: 1000,
  sizes: ["m"],
  colors: ["black"],
  images: { black: "/product.png" },
});

const pageResponse = (page: number, total = 1205): ListProductsResponse => ({
  success: true,
  data: Array.from(
    { length: Math.min(100, Math.max(0, total - (page - 1) * 100)) },
    (_, offset) => product((page - 1) * 100 + offset + 1),
  ),
  meta: {
    page,
    pageSize: 100,
    total,
    totalPages: Math.ceil(total / 100),
    hasPreviousPage: page > 1,
    hasNextPage: page < Math.ceil(total / 100),
  },
});

describe("product sitemap pagination", () => {
  test("includes products beyond the first page with bounded concurrency", async () => {
    let active = 0;
    let peak = 0;
    const pages: number[] = [];
    const products = await loadSitemapProducts(async (page) => {
      active++;
      peak = Math.max(peak, active);
      pages.push(page);
      await Promise.resolve();
      active--;
      return pageResponse(page);
    });
    expect(products).toHaveLength(1205);
    expect(products.at(-1)?.id).toBe(1205);
    expect(new Set(pages).size).toBe(13);
    expect(peak).toBeLessThanOrEqual(5);
  });

  test("deduplicates entries if the catalog changes between pages", async () => {
    const products = await loadSitemapProducts(async (page) => {
      const response = pageResponse(page, 101);
      if (page === 2) response.data = [product(100)];
      return response;
    });
    expect(products).toHaveLength(100);
  });

  test("rejects a partial fetch so a truncated sitemap is not cached", async () => {
    await expect(
      loadSitemapProducts(async (page) => {
        if (page === 2) throw new Error("Catalog unavailable");
        return pageResponse(page, 101);
      }),
    ).rejects.toThrow("Catalog unavailable");
  });

  test("requires splitting before the sitemap protocol's URL limit is exceeded", async () => {
    let calls = 0;
    await expect(
      loadSitemapProducts(async (page) => {
        calls++;
        return pageResponse(page, 50_000);
      }),
    ).rejects.toThrow("split it into sitemaps");
    expect(calls).toBe(1);
  });
});
