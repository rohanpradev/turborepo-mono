import type { ReactNode } from "react";
import { createStoreMetadata } from "@/lib/metadata";

export const metadata = createStoreMetadata({
  description: "Review your Common Goods order history and payment status.",
  noIndex: true,
  title: "Your orders",
});

export default function OrdersLayout({ children }: { children: ReactNode }) {
  return children;
}
