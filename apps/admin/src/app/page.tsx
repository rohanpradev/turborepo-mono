import {
  getPaymentIntegrationEvents,
  getPaymentServiceHealth,
  getPaymentServiceServerUrl,
  getPaymentServiceUrl,
} from "@repo/api-client";
import { formatUsdFromCents } from "@repo/types";
import {
  ArrowRight,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdminAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

const liveFetchOptions = {
  cache: "no-store" as const,
};

const formatEventTimestamp = (timestamp: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));

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
      value: recentPayments.length.toLocaleString(),
    },
    {
      description: "Captured across the recent event window",
      icon: Banknote,
      label: "Recent revenue",
      tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
      value: formatUsdFromCents(recentRevenueCents),
    },
    {
      description: "Checkout sessions awaiting or completing payment",
      icon: ShoppingCart,
      label: "Checkouts",
      tone: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
      value: recentCheckouts.length.toLocaleString(),
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
        className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(125deg,oklch(0.2_0.07_264),oklch(0.31_0.13_265))] px-6 py-7 text-white shadow-[0_30px_70px_-42px_rgba(32,43,90,0.85)] sm:px-8 sm:py-9"
      >
        <div
          className="absolute -right-12 -top-24 size-72 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute -right-2 -top-14 size-52 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="border-white/12 bg-white/10 text-white">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              Operations briefing
            </Badge>
            <h1
              id="dashboard-heading"
              className="mt-5 max-w-2xl text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-5xl"
            >
              Commerce, clearly in view.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/68 sm:text-base sm:leading-7">
              Track revenue, checkout activity, and service health from one
              focused operating surface.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {latestEventTimestamp ? (
              <div className="flex min-h-10 items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-3 text-xs text-white/65 backdrop-blur">
                <Clock3 className="size-4" aria-hidden="true" />
                Updated {formatEventTimestamp(latestEventTimestamp)}
              </div>
            ) : null}
            <Button asChild variant="secondary" size="lg">
              <Link href="/payments">
                Open payments
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-3 break-words text-3xl font-bold tracking-[-0.04em]">
                  {metric.value}
                </p>
              </div>
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-xl ${metric.tone}`}
              >
                <metric.icon className="size-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {metric.description}
            </p>
          </article>
        ))}
      </section>

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
                        <span className="size-1.5 rounded-full bg-emerald-500" />
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
                        {formatEventTimestamp(event.timestamp)}
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
