import type { ListProductsResponse } from "@repo/api-client";

// Reserve two entries for the storefront and collection landing pages.
const MAX_PRODUCTS = 49_998;
const PAGE_CONCURRENCY = 5;

export async function loadSitemapProducts(
  loadPage: (page: number) => Promise<ListProductsResponse>,
) {
  const first = await loadPage(1);
  if (first.meta.total > MAX_PRODUCTS) {
    throw new Error(
      "Catalog exceeds a single sitemap; split it into sitemaps.",
    );
  }

  const products = new Map(first.data.map((product) => [product.id, product]));
  for (let page = 2; page <= first.meta.totalPages; page += PAGE_CONCURRENCY) {
    const pages = await Promise.all(
      Array.from(
        {
          length: Math.min(PAGE_CONCURRENCY, first.meta.totalPages - page + 1),
        },
        (_, offset) => loadPage(page + offset),
      ),
    );
    for (const response of pages) {
      for (const product of response.data) products.set(product.id, product);
    }
  }

  return [...products.values()].slice(0, MAX_PRODUCTS);
}
