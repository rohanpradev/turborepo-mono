import { listProducts } from "@repo/api-client";
import { getProductServiceServerUrl } from "@repo/api-client/server";
import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { loadSitemapProducts } from "@/lib/sitemap-products";

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_CLIENT_APP_URL ||
  process.env.CLIENT_APP_URL ||
  "http://localhost:3002";

const buildUrl = (path: string) => new URL(path, getBaseUrl()).toString();

async function getSitemapProducts(baseUrl: string) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  return loadSitemapProducts((page) =>
    listProducts(
      baseUrl,
      { limit: 100, page, sort: "oldest" },
      { cache: "no-store" },
    ),
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Generate against the runtime catalog; never cache a build-time outage.
  await connection();

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
    const products = await getSitemapProducts(baseUrl);

    return [
      ...staticRoutes,
      ...products.map((product) => ({
        url: buildUrl(`/products/${product.id}`),
        lastModified: product.updatedAt
          ? new Date(product.updatedAt)
          : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    console.error("Product sitemap unavailable:", error);
    return staticRoutes;
  }
}
