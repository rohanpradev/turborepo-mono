import type { ReactNode } from "react";
import { createStoreMetadata } from "@/lib/metadata";

export const metadata = createStoreMetadata({
  description: "Verify the result of a Common Goods checkout session.",
  noIndex: true,
  title: "Checkout result",
});

export default function ReturnLayout({ children }: { children: ReactNode }) {
  return children;
}
