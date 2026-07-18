import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import AdminNavbar, { adminViewerFallback } from "@/components/AdminNavbar";
import AppSidebar from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SidebarProvider } from "@/components/ui/sidebar";

const createMetadataBase = (value: string | undefined, fallback: string) => {
  try {
    return new URL(value ?? fallback);
  } catch {
    return new URL(fallback);
  }
};

export const metadata: Metadata = {
  title: {
    default: "Flagship Commerce Admin",
    template: "%s | Flagship Commerce Admin",
  },
  description:
    "Operations dashboard for products, payments, Kafka event flow, and storefront services.",
  metadataBase: createMetadataBase(
    process.env.NEXT_PUBLIC_ADMIN_APP_URL ?? process.env.ADMIN_APP_URL,
    "http://localhost:3003",
  ),
  robots: {
    index: false,
    follow: false,
    nocache: true,
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
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider>
        <a
          href="#admin-content"
          className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-xl transition focus:translate-y-0"
        >
          Skip to main content
        </a>
        <AppSidebar />
        <main
          id="admin-content"
          className="min-h-screen min-w-0 flex-1 outline-none"
          tabIndex={-1}
        >
          <Suspense fallback={<Navbar viewer={adminViewerFallback} />}>
            <AdminNavbar />
          </Suspense>
          <div className="mx-auto w-full max-w-[1500px] px-3 pb-8 sm:px-5">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </ThemeProvider>
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen antialiased">
        {isClerkConfigured ? <ClerkProvider>{shell}</ClerkProvider> : shell}
      </body>
    </html>
  );
}
