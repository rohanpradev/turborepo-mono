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
    default: "Commerce",
    template: "%s | Commerce",
  },
  applicationName: "Commerce",
  description: "Commerce storefront for browsing products and checking out.",
  metadataBase,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Commerce",
    description: "Commerce storefront for browsing products and checking out.",
    siteName: "Commerce",
    type: "website",
    url: "/",
    images: [
      {
        url: "/featured.png",
        alt: "Featured Commerce products",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Commerce",
    description: "Commerce storefront for browsing products and checking out.",
    images: ["/featured.png"],
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
    <div className="min-h-screen bg-[#f4f6f3] text-gray-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );

  return (
    <html lang="en">
      <body className="antialiased">
        {isClerkConfigured ? <ClerkProvider>{shell}</ClerkProvider> : shell}
        <ToastContainer position="bottom-right" />
      </body>
    </html>
  );
}
