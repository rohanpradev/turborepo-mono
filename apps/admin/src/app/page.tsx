import {
  getPaymentIntegrationEvents,
  getPaymentServiceHealth,
  getPaymentServiceServerUrl,
  getPaymentServiceUrl,
} from "@repo/api-client";
import { formatUsdFromCents } from "@repo/types";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  RadioTower,
  Server,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import DashboardActions from "@/components/DashboardActions";
import RefreshButton from "@/components/RefreshButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/admin-data";
import { requireAdminAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

const liveFetchOptions = {
  cache: "no-store" as const,
};

const uniquePaymentsByTransaction = <
  T extends { details?: { transactionId?: unknown } },
>(
  events: Array<T>,
) => {
  const transactionIds = new Set<string>();

  return events.filter((event) => {
    const transactionId = event.details?.transactionId;

    if (typeof transactionId !== "string") {
      return true;
    }

    if (transactionIds.has(transactionId)) {
      return false;
    }

    transactionIds.add(transactionId);
    return true;
  });
};

const HomePage = async () => {
  const { token } = await requireAdminAccess();
  const paymentServiceUrl = getPaymentServiceServerUrl();
  const paymentServicePublicUrl = getPaymentServiceUrl();

  const [paymentEvents, paymentHealth] = await Promise.all([
    getPaymentIntegrationEvents(paymentServiceUrl, {
      fetchOptions: liveFetchOptions,
      token,
    }).catch((error) => ({
      error:
        error instanceof Error
          ? error.message
          : "Unable to load payment integration events.",
    })),
    getPaymentServiceHealth(paymentServiceUrl, liveFetchOptions).catch(
      (error) => ({
        error:
          error instanceof Error
            ? error.message
            : "Unable to load payment service health.",
      }),
    ),
  ]);

  const recentEvents =
    "data" in paymentEvents ? paymentEvents.data.recentEvents : [];
  const recentPayments = uniquePaymentsByTransaction(
    recentEvents.filter(
      (event) => event.type === "payment.successful.published",
    ),
  );
  const recentCheckouts = recentEvents.filter(
    (event) => event.type === "checkout.session.created",
  );
  const latestEventTimestamp = recentEvents[0]?.timestamp ?? null;
  const recentRevenueCents = recentPayments.reduce((total, event) => {
    const amount = event.details?.amount;
    return total + (typeof amount === "number" ? amount : 0);
  }, 0);
  const serviceState =
    "error" in paymentHealth
      ? "Offline"
      : paymentHealth.ready
        ? "Operational"
        : "Degraded";

  const metrics = [
    {
      description: "Successful payment events in the current window",
      icon: CreditCard,
      label: "Transactions",
      tone: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
      value:
        "error" in paymentEvents
          ? "Unavailable"
          : recentPayments.length.toLocaleString(),
    },
    {
      description: "Captured across the recent event window",
      icon: Banknote,
      label: "Recent revenue",
      tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
      value:
        "error" in paymentEvents
          ? "Unavailable"
          : formatUsdFromCents(recentRevenueCents),
    },
    {
      description: "Checkout sessions awaiting or completing payment",
      icon: ShoppingCart,
      label: "Checkouts",
      tone: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
      value:
        "error" in paymentEvents
          ? "Unavailable"
          : recentCheckouts.length.toLocaleString(),
    },
    {
      description: "Live readiness from the payment service",
      icon: RadioTower,
      label: "Service health",
      tone:
        serviceState === "Operational"
          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
          : "bg-rose-500/12 text-rose-700 dark:text-rose-300",
      value: serviceState,
    },
  ] as const;

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
          <RefreshButton />
          {latestEventTimestamp ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Latest event {formatTimestamp(latestEventTimestamp)}
            </p>
          ) : null}
        </div>
      </section>

      <section
        aria-label="Key commerce metrics"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="group rounded-2xl border bg-card p-5 shadow-[0_16px_36px_-30px_rgba(28,39,72,0.55)] transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_24px_50px_-32px_rgba(28,39,72,0.62)]"
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

          {"error" in paymentHealth ? (
            <div
              role="status"
              className="mt-5 rounded-xl border border-rose-300/70 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/35 dark:text-rose-200"
            >
              <p className="font-bold">Service unavailable</p>
              <p className="mt-1 leading-6">{paymentHealth.error}</p>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/65 p-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-9 place-items-center rounded-full ${
                      paymentHealth.ready
                        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {paymentHealth.ready ? (
                      <CheckCircle2 className="size-5" aria-hidden="true" />
                    ) : (
                      <Clock3 className="size-5" aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-bold">
                      {paymentHealth.ready
                        ? "All systems ready"
                        : "Degraded response"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {paymentHealth.service}
                    </p>
                  </div>
                </div>
                <Badge variant={paymentHealth.ready ? "success" : "warning"}>
                  {paymentHealth.ready ? "Ready" : "Degraded"}
                </Badge>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Dependencies
                </h3>
                <ul className="mt-3 space-y-2">
                  {paymentHealth.dependencies.map((dependency) => (
                    <li
                      key={dependency.name}
                      className="flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm"
                    >
                      <span className="font-medium">{dependency.name}</span>
                      <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <span
                          aria-hidden="true"
                          className={`size-1.5 rounded-full ${dependency.status === "ready" ? "bg-emerald-500" : dependency.status === "disabled" ? "bg-slate-400" : "bg-amber-500"}`}
                        />
                        {dependency.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <a
            href={paymentServicePublicUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <span className="min-w-0 truncate font-mono">
              {paymentServicePublicUrl}
            </span>
            <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">Open payment service in a new tab</span>
          </a>
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
            {recentPayments.length > 0 ? (
              recentPayments.slice(0, 6).map((event) => {
                const amount =
                  typeof event.details?.amount === "number"
                    ? event.details.amount
                    : 0;
                const itemCount =
                  typeof event.details?.itemCount === "number"
                    ? event.details.itemCount
                    : 0;
                const transactionId =
                  typeof event.details?.transactionId === "string"
                    ? event.details.transactionId
                    : "Unavailable";

                return (
                  <li
                    key={event.id}
                    className="grid gap-3 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-bold">Payment captured</p>
                        <span className="text-xs text-muted-foreground">
                          · {itemCount} item{itemCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {transactionId}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-bold">{formatUsdFromCents(amount)}</p>
                      <time
                        dateTime={event.timestamp}
                        className="mt-1 block text-xs text-muted-foreground"
                      >
                        {formatTimestamp(event.timestamp)}
                      </time>
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="py-12 text-center">
                <CreditCard
                  className="mx-auto size-7 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold">No payments yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Successful payments will appear here as they arrive.
                </p>
              </li>
            )}
          </ol>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
