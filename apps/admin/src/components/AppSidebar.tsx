"use client";

import {
  Activity,
  Boxes,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type AppSidebarProps = {
  viewer?: never;
};

const primaryLinks = [
  {
    href: "/",
    icon: LayoutDashboard,
    label: "Overview",
  },
  {
    href: "/payments",
    icon: CreditCard,
    label: "Payments",
  },
  {
    href: "/products",
    icon: Boxes,
    label: "Products",
  },
  {
    href: "/users",
    icon: Users,
    label: "Customers",
  },
] as const;

const AppSidebar = (_props: AppSidebarProps) => {
  const pathname = usePathname();
  const storefrontUrl =
    process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? "http://localhost:3002";

  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="px-2 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Flagship Admin"
              className="h-13 rounded-xl hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center"
            >
              <Link href="/">
                <BrandMark className="size-9 shrink-0 drop-shadow-lg group-data-[collapsible=icon]:size-8" />
                <span className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-bold">
                    Flagship Admin
                  </span>
                  <span className="truncate text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">
                    Commerce OS
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-sidebar-border" />

      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[0.625rem] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
            Control room
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {primaryLinks.map((item) => {
                const active = isActive(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className="h-10 rounded-xl px-3 data-[active=true]:shadow-sm"
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                      >
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[0.625rem] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
            Live tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Storefront"
                  className="h-10 rounded-xl px-3"
                >
                  <a href={storefrontUrl}>
                    <ExternalLink aria-hidden="true" />
                    <span>Storefront</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Payment events"
                  className="h-10 rounded-xl px-3"
                >
                  <Link href="/payments#timeline">
                    <Activity aria-hidden="true" />
                    <span>Payment events</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/55 p-3 text-xs text-sidebar-foreground/65 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 font-semibold text-sidebar-foreground">
            <ShieldCheck
              className="size-4 text-emerald-300"
              aria-hidden="true"
            />
            Protected workspace
          </div>
          <p className="mt-1.5 leading-5">
            Admin access and mutations are session-gated.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
