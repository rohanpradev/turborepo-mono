import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "sonner";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import "./globals.css";

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
    "A considered edit of everyday apparel, denim, and footwear with secure checkout.",
  metadataBase,
  openGraph: {
    description:
      "A considered edit of everyday apparel, denim, and footwear with secure checkout.",
    images: [
      {
        alt: "Common Goods — Objects for everyday life",
        height: 630,
        url: "/og.png",
        width: 1200,
      },
    ],
    siteName: "Common Goods",
    title: "Common Goods — Objects for everyday life",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "A considered edit of everyday apparel, denim, and footwear with secure checkout.",
    images: ["/og.png"],
    title: "Common Goods — Objects for everyday life",
  },
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
    <div className="min-h-screen text-foreground">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-xl transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex min-h-screen w-full max-w-[94rem] flex-col px-3 py-3 sm:px-5 sm:py-4 lg:px-8">
        <Suspense
          fallback={
            <div
              aria-hidden="true"
              className="mb-8 min-h-24 rounded-xl border border-border/90 bg-card shadow-[0_12px_35px_-26px_rgba(28,25,23,0.55)]"
            />
          }
        >
          <Navbar />
        </Suspense>
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
          <Suspense
            fallback={
              <div
                role="status"
                aria-label="Loading Common Goods"
                className="flex min-h-screen items-center justify-center bg-background"
              >
                <div className="size-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
              </div>
            }
          >
            <ClerkProvider
              signInUrl="/sign-in"
              signUpUrl="/sign-up"
              signInFallbackRedirectUrl="/"
              signUpFallbackRedirectUrl="/"
            >
              {shell}
            </ClerkProvider>
          </Suspense>
        ) : (
          shell
        )}
        <Toaster
          closeButton
          position="bottom-right"
          richColors
          toastOptions={{
            classNames: {
              toast: "font-sans",
            },
          }}
        />
      </body>
    </html>
  );
}
