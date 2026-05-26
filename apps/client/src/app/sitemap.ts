import {
  getProductServiceServerUrl,
  listCategories,
  listProducts,
} from "@repo/api-client";
import type { MetadataRoute } from "next";

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_CLIENT_APP_URL ||
  process.env.CLIENT_APP_URL ||
  "http://localhost:3002";

const buildUrl = (path: string) => new URL(path, getBaseUrl()).toString();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: buildUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: buildUrl("/products"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    const baseUrl = getProductServiceServerUrl();
    const [productsResponse, categoriesResponse] = await Promise.all([
      listProducts(baseUrl, { limit: 100 }, { cache: "no-store" }),
      listCategories(baseUrl, { cache: "no-store" }),
    ]);

    return [
      ...staticRoutes,
      ...categoriesResponse.data.map((category) => ({
        url: buildUrl(
          `/products?category=${encodeURIComponent(category.slug)}`,
        ),
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...productsResponse.data.map((product) => ({
        url: buildUrl(`/products/${product.id}`),
        lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
