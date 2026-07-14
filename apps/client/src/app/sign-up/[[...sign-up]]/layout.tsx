import type { ReactNode } from "react";
import { createStoreMetadata } from "@/lib/metadata";

export const metadata = createStoreMetadata({
  description: "Create a Common Goods account for checkout and order history.",
  noIndex: true,
  title: "Create an account",
});

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children;
}
