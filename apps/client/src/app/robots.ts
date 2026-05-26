import type { MetadataRoute } from "next";

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_CLIENT_APP_URL ??
  process.env.CLIENT_APP_URL ??
  "http://localhost:3002";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/orders", "/return", "/test"],
    },
    sitemap: new URL("/sitemap.xml", getBaseUrl()).toString(),
  };
}
