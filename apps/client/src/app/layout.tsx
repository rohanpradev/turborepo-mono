import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastContainer } from "react-toastify";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trendlama - Best Clothes",
  description: "Trendlama is the best place to find the best clothes",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_CLIENT_APP_URL ??
      process.env.CLIENT_APP_URL ??
      "http://localhost:3002",
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Trendlama - Best Clothes",
    description: "Trendlama is the best place to find the best clothes",
    images: [
      {
        url: "/featured.png",
        alt: "Featured TrendLama products",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trendlama - Best Clothes",
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
