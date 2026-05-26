"use client";

import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

type NavbarProps = {
  viewer: {
    avatarUrl: string | null;
    displayName: string;
    email: string | null;
  };
};

const getInitials = (displayName: string) =>
  displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "AO";

const Navbar = ({ viewer }: NavbarProps) => {
  const { setTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-10 border-b bg-background/95 px-3 py-3 backdrop-blur sm:px-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg border bg-card p-1">
            <SidebarTrigger />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              Flagship Commerce Admin
            </p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              Live commerce operations for products, payments, and customers
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs text-muted-foreground xl:flex">
            <Link href="/">Overview</Link>
            <span>/</span>
            <Link href="/payments">Payments</Link>
            <span>/</span>
            <Link href="/products">Products</Link>
            <span>/</span>
            <Link href="/users">Customers</Link>
          </div>

          <div className="rounded-full border bg-card">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-full border bg-card px-2 py-2 sm:px-3">
            <Avatar className="size-9">
              <AvatarImage src={viewer.avatarUrl ?? undefined} />
              <AvatarFallback>{getInitials(viewer.displayName)}</AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 sm:block sm:max-w-44 lg:max-w-56">
              <p className="truncate text-sm font-medium">
                {viewer.displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {viewer.email ?? "Signed in via Clerk"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
