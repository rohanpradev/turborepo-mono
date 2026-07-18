"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

const pageDetails = [
  {
    href: "/",
    label: "Overview",
    description: "A live pulse of commerce operations",
  },
  {
    href: "/payments",
    label: "Payments",
    description: "Transactions, service health, and events",
  },
  {
    href: "/products",
    label: "Products",
    description: "Inventory and catalog management",
  },
  {
    href: "/users",
    label: "Customers",
    description: "Customer value and order activity",
  },
] as const;

const getInitials = (displayName: string) =>
  displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "AO";

const Navbar = ({ viewer }: NavbarProps) => {
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const currentPage =
    pageDetails.find((page) =>
      page.href === "/"
        ? pathname === page.href
        : pathname.startsWith(page.href),
    ) ?? pageDetails[0];

  return (
    <header className="sticky top-0 z-20 border-b bg-background/86 px-3 py-3 backdrop-blur-xl sm:px-5">
      <div className="mx-auto flex min-h-12 w-full max-w-[1500px] min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-xl border bg-card p-1 shadow-sm">
            <SidebarTrigger className="size-9" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight">
              {currentPage.label}
            </p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {currentPage.description}
            </p>
          </div>
        </div>

        <nav
          aria-label="Admin sections"
          className="hidden items-center rounded-xl border bg-card/80 p-1 shadow-sm lg:flex"
        >
          {pageDetails.map((page) => {
            const active =
              page.href === "/"
                ? pathname === page.href
                : pathname.startsWith(page.href);

            return (
              <Link
                key={page.href}
                href={page.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {page.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative rounded-xl bg-card"
                aria-label="Choose color theme"
              >
                <Sun
                  className="size-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                  aria-hidden="true"
                />
                <Moon
                  className="absolute size-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                  aria-hidden="true"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun aria-hidden="true" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon aria-hidden="true" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Laptop aria-hidden="true" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-card px-1.5 py-1.5 shadow-sm sm:px-2.5">
            <Avatar className="size-9 rounded-lg">
              <AvatarImage
                src={viewer.avatarUrl ?? undefined}
                alt={`${viewer.displayName} profile`}
              />
              <AvatarFallback className="rounded-lg bg-primary/10 font-bold text-primary">
                {getInitials(viewer.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 sm:block sm:max-w-40 xl:max-w-52">
              <p className="truncate text-xs font-bold">{viewer.displayName}</p>
              <p className="truncate text-[0.6875rem] text-muted-foreground">
                {viewer.email ?? "Admin operator"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
