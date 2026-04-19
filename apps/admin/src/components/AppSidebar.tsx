import {
  Activity,
  Boxes,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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

const opsLinks = [
  {
    href: process.env.CLIENT_APP_URL ?? "http://localhost:3002",
    icon: ExternalLink,
    label: "Storefront",
    external: true,
  },
  {
    href: "/payments#timeline",
    icon: Activity,
    label: "Payment Events",
    external: false,
  },
] as const;

const AppSidebar = (_props: AppSidebarProps) => {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <Image
                  src="/logo.svg"
                  alt="Flagship logo"
                  width={20}
                  height={20}
                />
                <span>Flagship Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Control Room</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryLinks.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Live Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {opsLinks.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild>
                    {item.external ? (
                      <a href={item.href} rel="noreferrer" target="_blank">
                        <item.icon />
                        <span>{item.label}</span>
                      </a>
                    ) : (
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Commerce ops console
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
