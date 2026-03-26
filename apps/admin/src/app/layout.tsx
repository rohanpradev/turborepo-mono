import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import AppSidebar from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SidebarProvider } from "@/components/ui/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flagship Commerce Admin",
  description:
    "Operations dashboard for products, payments, Kafka event flow, and storefront services.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const viewer = await currentUser().catch(() => null);
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar viewer={viewerProfile} />
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
