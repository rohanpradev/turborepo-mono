import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore, viewer] = await Promise.all([
    cookies(),
    currentUser().catch(() => null),
  ]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const viewerProfile = {
    avatarUrl: viewer?.imageUrl ?? null,
    displayName:
      [viewer?.firstName, viewer?.lastName].filter(Boolean).join(" ").trim() ||
      viewer?.username ||
      viewer?.primaryEmailAddress?.emailAddress ||
      "Admin Operator",
    email: viewer?.primaryEmailAddress?.emailAddress ?? null,
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <main className="w-full">
              <Navbar viewer={viewerProfile} />
              <div className="px-4">{children}</div>
            </main>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
