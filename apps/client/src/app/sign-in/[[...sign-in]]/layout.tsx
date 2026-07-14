import type { ReactNode } from "react";
import { createStoreMetadata } from "@/lib/metadata";

export const metadata = createStoreMetadata({
  description: "Sign in securely to access checkout and your order history.",
  noIndex: true,
  title: "Sign in",
});

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children;
}
