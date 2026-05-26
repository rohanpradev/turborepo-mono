import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Commerce",
    short_name: "Commerce",
    description: "Browse products, manage a cart, and complete checkout.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#111827",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
