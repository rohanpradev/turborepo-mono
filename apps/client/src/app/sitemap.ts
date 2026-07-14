import { getProductServiceServerUrl, listProducts } from "@repo/api-client";
import type { MetadataRoute } from "next";

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_CLIENT_APP_URL ||
  process.env.CLIENT_APP_URL ||
  "http://localhost:3002";

const buildUrl = (path: string) => new URL(path, getBaseUrl()).toString();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: buildUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: buildUrl("/products"),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    const baseUrl = getProductServiceServerUrl();
    const productsResponse = await listProducts(
      baseUrl,
      { limit: 100 },
      { cache: "no-store" },
    );

    return [
      ...staticRoutes,
      ...productsResponse.data.map((product) => ({
        url: buildUrl(`/products/${product.id}`),
        lastModified: product.updatedAt
          ? new Date(product.updatedAt)
          : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
