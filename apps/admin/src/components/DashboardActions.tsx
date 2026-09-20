import { ArrowUpRight, Boxes, CreditCard, Users } from "lucide-react";
import Link from "next/link";

const actions = [
  {
    href: "/products",
    icon: Boxes,
    title: "Manage catalog",
    description: "Update products, pricing, and variants",
  },
  {
    href: "/payments",
    icon: CreditCard,
    title: "Review payments",
    description: "Follow transactions and checkout activity",
  },
  {
    href: "/users",
    icon: Users,
    title: "Explore customers",
    description: "Find customer profiles and order history",
  },
] as const;

export default function DashboardActions() {
  return (
    <nav aria-label="Quick actions" className="grid gap-3 md:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary">
            <action.icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{action.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {action.description}
            </p>
          </div>
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      ))}
    </nav>
  );
}
