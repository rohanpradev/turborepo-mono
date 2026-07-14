import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Common Goods",
    short_name: "Common Goods",
    description: "Browse products, manage a cart, and complete checkout.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#1c1917",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
