import type { ReactNode } from "react";
import { createStoreMetadata } from "@/lib/metadata";

export const metadata = createStoreMetadata({
  description: "Review your selections and continue through secure checkout.",
  noIndex: true,
  title: "Cart",
});

export default function CartLayout({ children }: { children: ReactNode }) {
  return children;
}
