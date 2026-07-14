import type { Metadata } from "next";

const STORE_NAME = "Common Goods";
const DEFAULT_DESCRIPTION =
  "Shop curated apparel, denim, and footwear with a fast catalog and secure checkout.";

export const createStoreMetadata = ({
  canonical,
  description = DEFAULT_DESCRIPTION,
  image = "/featured.png",
  noIndex = false,
  title,
}: {
  canonical?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  title: string;
}): Metadata => ({
  title,
  description,
  alternates: canonical ? { canonical } : undefined,
  robots: noIndex
    ? {
        follow: false,
        index: false,
        nocache: true,
      }
    : undefined,
  openGraph: canonical
    ? {
        title,
        description,
        images: [{ alt: `${title} — ${STORE_NAME}`, url: image }],
        siteName: STORE_NAME,
        type: "website",
        url: canonical,
      }
    : undefined,
  twitter: canonical
    ? {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      }
    : undefined,
});
