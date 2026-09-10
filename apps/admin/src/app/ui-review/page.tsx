import {
  Banknote,
  CheckCircle2,
  CreditCard,
  RadioTower,
  Server,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import DashboardActions from "@/components/DashboardActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const metrics = [
  {
    description: "Successful payment events in the current window",
    icon: CreditCard,
    label: "Transactions",
    tone: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    value: "248",
  },
  {
    description: "Captured across the recent event window",
    icon: Banknote,
    label: "Recent revenue",
    tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    value: "$18,492.80",
  },
  {
    description: "Checkout sessions awaiting or completing payment",
    icon: ShoppingCart,
    label: "Checkouts",
    tone: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
    value: "319",
  },
  {
    description: "Live readiness from the payment service",
    icon: RadioTower,
    label: "Service health",
    tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    value: "Operational",
  },
] as const;

const transactions = [
  ["txn_9472FQ", "$129.90", "2 items", "Today, 9:42 AM"],
  ["txn_9471EK", "$74.90", "1 item", "Today, 9:31 AM"],
  ["txn_9469VM", "$159.80", "3 items", "Today, 9:14 AM"],
  ["txn_9467BA", "$89.90", "1 item", "Today, 8:58 AM"],
] as const;

export default function UiReviewPage() {
  return (
    <div className="space-y-5 py-5 sm:space-y-6 sm:py-6">
      <section
        aria-labelledby="dashboard-heading"
        className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-end"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Workspace / Overview
          </p>
          <h1
            id="dashboard-heading"
            className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl"
          >
            Your store at a glance
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Keep up with payments, monitor your store, and pick up where you
            left off.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">Sample data · UI preview</Badge>
        </div>
      </section>

      <section
        aria-label="Key commerce metrics"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="group rounded-2xl border bg-card p-5 shadow-[0_16px_36px_-30px_rgba(28,39,72,0.55)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {metric.label}
              </p>
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-lg ${metric.tone}`}
              >
                <metric.icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 break-words text-3xl font-bold tabular-nums tracking-[-0.04em]">
              {metric.value}
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {metric.description}
            </p>
          </article>
        ))}
      </section>

      <DashboardActions />

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <section
          aria-labelledby="service-heading"
          className="rounded-2xl border bg-card p-5 shadow-[0_16px_36px_-30px_rgba(28,39,72,0.5)] sm:p-6"
        >
          <div className="flex items-start justify-between gap-4 border-b pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Infrastructure
              </p>
              <h2
                id="service-heading"
                className="mt-1 text-xl font-bold tracking-tight"
              >
                Payment service
              </h2>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Server className="size-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/65 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold">All systems ready</p>
                  <p className="text-xs text-muted-foreground">
                    payment-service
                  </p>
                </div>
              </div>
              <Badge variant="success">Ready</Badge>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Dependencies
              </h3>
              <ul className="mt-3 space-y-2">
                {["Kafka event stream", "Stripe gateway", "Order service"].map(
                  (name) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm"
                    >
                      <span className="font-medium">{name}</span>
                      <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="transactions-heading"
          className="rounded-2xl border bg-card p-5 shadow-[0_16px_36px_-30px_rgba(28,39,72,0.5)] sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Recent activity
              </p>
              <h2
                id="transactions-heading"
                className="mt-1 text-xl font-bold tracking-tight"
              >
                Latest transactions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirmed payment events, newest first.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/payments">View timeline</Link>
            </Button>
          </div>
          <ol className="mt-2 divide-y">
            {transactions.map(([id, amount, count, time]) => (
              <li
                key={id}
                className="grid gap-3 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="font-bold">Payment captured</p>
                    <span className="text-xs text-muted-foreground">
                      · {count}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {id}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="font-bold">{amount}</p>
                  <time className="mt-1 block text-xs text-muted-foreground">
                    {time}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
