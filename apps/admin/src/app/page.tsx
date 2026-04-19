import {
  getPaymentIntegrationEvents,
  getPaymentServiceHealth,
  getPaymentServiceServerUrl,
  getPaymentServiceUrl,
} from "@repo/api-client";
import { formatUsdFromCents } from "@repo/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const liveFetchOptions = {
  cache: "no-store" as const,
};

const formatEventTimestamp = (timestamp: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));

const HomePage = async () => {
  const paymentServiceUrl = getPaymentServiceServerUrl();
  const paymentServicePublicUrl = getPaymentServiceUrl();

  const [paymentEvents, paymentHealth] = await Promise.all([
    getPaymentIntegrationEvents(paymentServiceUrl, liveFetchOptions).catch(
      (error) => ({
        error:
          error instanceof Error
            ? error.message
            : "Unable to load payment integration events.",
      }),
    ),
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
  const recentPayments = recentEvents.filter(
    (event) => event.type === "payment.successful.published",
  );
  const recentCheckouts = recentEvents.filter(
    (event) => event.type === "checkout.session.created",
  );
  const latestEventTimestamp = recentEvents[0]?.timestamp ?? null;
  const recentRevenueCents = recentPayments.reduce((total, event) => {
    const amount = event.details?.amount;
    return total + (typeof amount === "number" ? amount : 0);
  }, 0);

  return (
    <section className="space-y-6 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Admin Dashboard
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Payment operations overview
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              The admin dashboard now focuses on payment confirmation, checkout
              sessions, and the payment service health signal only.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/payments">Open payments control room</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Latest Transactions
          </p>
          <p className="mt-3 text-3xl font-semibold">{recentPayments.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Successful payment events observed by the payment service.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Recent Revenue
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {formatUsdFromCents(recentRevenueCents)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Total from the recent successful payments retained in memory.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Checkout Sessions
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {recentCheckouts.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Checkout sessions created by the current payment-service process.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Payment Service
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {"error" in paymentHealth
              ? "Offline"
              : paymentHealth.ready
                ? "Up"
                : "Slow"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Public endpoint: {paymentServicePublicUrl}
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Service Status</h2>
            <p className="text-sm text-muted-foreground">
              Current runtime health for the live checkout API.
            </p>
          </div>

          {"error" in paymentHealth ? (
            <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-4 text-sm text-red-700">
              {paymentHealth.error}
            </div>
          ) : (
            <article className="rounded-xl border border-dashed p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">Payment Service</h3>
                  <p className="text-xs text-muted-foreground">
                    {paymentHealth.service}
                  </p>
                </div>
                <Badge variant={paymentHealth.ready ? "success" : "warning"}>
                  {paymentHealth.ready ? "Ready" : "Degraded"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {paymentHealth.dependencies.map((dependency) => (
                  <Badge
                    key={dependency.name}
                    variant="outline"
                    className="px-2.5 py-1 text-xs"
                  >
                    {dependency.name}: {dependency.status}
                  </Badge>
                ))}
              </div>
            </article>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Latest Transactions</h2>
              <p className="text-sm text-muted-foreground">
                Successful payment events published by the payment service.
              </p>
            </div>
            {latestEventTimestamp ? (
              <div className="text-right text-xs text-muted-foreground">
                Latest update: {formatEventTimestamp(latestEventTimestamp)}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            {recentPayments.length > 0 ? (
              recentPayments.map((event) => {
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
                const orderId =
                  typeof event.details?.orderId === "string"
                    ? event.details.orderId
                    : "Unavailable";

                return (
                  <article
                    key={event.id}
                    className="rounded-xl border border-dashed p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-base font-medium">
                          {formatUsdFromCents(amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {itemCount} item{itemCount === 1 ? "" : "s"} paid
                        </p>
                      </div>
                      <Badge
                        variant="default"
                        className="bg-emerald-600 text-white"
                      >
                        Success
                      </Badge>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <div className="min-w-0">
                        <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Session
                        </dt>
                        <dd className="mt-1 break-all font-mono text-xs">
                          {orderId}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Payment Intent
                        </dt>
                        <dd className="mt-1 break-all font-mono text-xs">
                          {transactionId}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-4 text-xs text-muted-foreground">
                      {formatEventTimestamp(event.timestamp)}
                    </p>
                  </article>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                No successful payments have been published yet in this
                payment-service process.
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
};

export default HomePage;
