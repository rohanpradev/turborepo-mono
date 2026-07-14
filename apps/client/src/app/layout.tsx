import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import "./globals.css";

const ToastContainer = dynamic(() =>
  import("react-toastify").then((mod) => mod.ToastContainer),
);

const createMetadataBase = (value: string | undefined, fallback: string) => {
  try {
    return new URL(value ?? fallback);
  } catch {
    return new URL(fallback);
  }
};

const metadataBase = createMetadataBase(
  process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? process.env.CLIENT_APP_URL,
  "http://localhost:3002",
);

export const metadata: Metadata = {
  title: {
    default: "Common Goods",
    template: "%s | Common Goods",
  },
  applicationName: "Common Goods",
  description:
    "Common Goods storefront for curated essentials and secure checkout.",
  metadataBase,
};

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("_here"),
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shell = (
    <div className="min-h-screen text-stone-950">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-gray-950 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex min-h-screen w-full max-w-[88rem] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <Navbar />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );

  return (
    <html lang="en">
      <body className="antialiased">
        {isClerkConfigured ? (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
          >
            {shell}
          </ClerkProvider>
        ) : (
          shell
        )}
        <ToastContainer position="bottom-right" />
      </body>
    </html>
  );
}
