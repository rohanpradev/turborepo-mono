import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import "./globals.css";

const ToastContainer = dynamic(
  () => import("react-toastify").then((mod) => mod.ToastContainer),
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    default: "TrendLama",
    template: "%s | TrendLama",
  },
  applicationName: "TrendLama",
  description: "Trendlama is the best place to find the best clothes",
  metadataBase,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TrendLama",
    description: "Trendlama is the best place to find the best clothes",
    siteName: "TrendLama",
    type: "website",
    url: "/",
    images: [
      {
        url: "/featured.png",
        alt: "Featured TrendLama products",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrendLama",
    description: "Trendlama is the best place to find the best clothes",
    images: ["/featured.png"],
  },
};

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shell = (
    <div className="mx-auto p-4 sm:px-0 sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-6xl">
      <Navbar />
      {children}
      <Footer />
    </div>
  );

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {isClerkConfigured ? <ClerkProvider>{shell}</ClerkProvider> : shell}
        <ToastContainer position="bottom-right" />
      </body>
    </html>
  );
}
