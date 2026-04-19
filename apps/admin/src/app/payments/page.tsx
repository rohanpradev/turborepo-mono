import {
  getPaymentIntegrationEvents,
  getPaymentServiceHealth,
  getPaymentServiceServerUrl,
  getPaymentServiceUrl,
} from "@repo/api-client";
import { formatUsdFromCents } from "@repo/types";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Payments",
  description:
    "Live checkout, Stripe confirmation, and payment event visibility for the commerce stack.",
};

const liveFetchOptions = {
  cache: "no-store" as const,
};

const PaymentsPage = async () => {
  const paymentServiceUrl = getPaymentServiceServerUrl();
  const paymentServicePublicUrl = getPaymentServiceUrl();

  const [paymentHealth, paymentEvents] = await Promise.all([
    getPaymentServiceHealth(paymentServiceUrl, liveFetchOptions).catch(
      (error) => ({
        error:
          error instanceof Error
            ? error.message
            : "Unable to load payment service health.",
      }),
    ),
    getPaymentIntegrationEvents(paymentServiceUrl, liveFetchOptions).catch(
      (error) => ({
        error:
          error instanceof Error
            ? error.message
            : "Unable to load payment integration events.",
      }),
    ),
  ]);

  const eventPayload = "data" in paymentEvents ? paymentEvents.data : null;
  const recentEvents = eventPayload?.recentEvents ?? [];
  const paymentTimelineEvents = recentEvents.filter(
    (event) =>
      event.type === "checkout.session.created" ||
      event.type === "payment.successful.published" ||
      event.type.startsWith("checkout.") ||
      event.source === "webhook",
  );
  const successfulPayments = paymentTimelineEvents.filter(
    (event) => event.type === "payment.successful.published",
  );
  const checkoutSessions = paymentTimelineEvents.filter(
    (event) => event.type === "checkout.session.created",
  );
  const recentRevenueCents = successfulPayments.reduce((total, event) => {
    const amount = event.details?.amount;
    return total + (typeof amount === "number" ? amount : 0);
  }, 0);

  return (
    <section className="space-y-6 py-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Payments Control Room
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Live checkout and payment flow
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              This page focuses on payment creation, Stripe confirmation, and
              the downstream event trail used to confirm successful checkout.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <a href="https://kafka.localhost" className="underline">
              Kafka UI
            </a>
            <a
              href="https://dashboard.localhost/dashboard/"
              className="underline"
            >
              Traefik Dashboard
            </a>
            <span className="text-muted-foreground">
              Public payment endpoint: {paymentServicePublicUrl}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Published Payments
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {successfulPayments.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Recent successful payment events observed by the payment service.
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
            Sum of the recent successful payment events currently retained in
            memory.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Checkout Sessions
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {checkoutSessions.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Checkout sessions created by the live payment service.
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
            Runtime health for the checkout API.
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <section
          id="timeline"
          className="rounded-2xl border bg-card p-5 shadow-sm"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Payment Service</h2>
            <p className="text-sm text-muted-foreground">
              Current runtime health for the payment API.
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
              <p className="mt-2 text-xs text-muted-foreground">
                {paymentServiceUrl}
              </p>
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
              <h2 className="text-lg font-semibold">Payment Timeline</h2>
              <p className="text-sm text-muted-foreground">
                Recent payment and checkout events from the payment service.
              </p>
            </div>
            {eventPayload ? (
              <div className="text-right text-xs text-muted-foreground">
                <div>Consumes: {eventPayload.topics.consumes.join(", ")}</div>
                <div>Publishes: {eventPayload.topics.publishes.join(", ")}</div>
              </div>
            ) : null}
          </div>

          {"error" in paymentEvents ? (
            <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-4 text-sm text-red-700">
              {paymentEvents.error}
            </div>
          ) : paymentTimelineEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No payment integration events recorded yet. Start the stack and
              create a checkout session to populate the live feed.
            </div>
          ) : (
            <div className="space-y-3">
              {paymentTimelineEvents.map((event) => {
                const amount = event.details?.amount;
                const itemCount = event.details?.itemCount;
                const sessionId = event.details?.sessionId;
                const transactionId = event.details?.transactionId;

                return (
                  <article
                    key={event.id}
                    className="rounded-xl border border-dashed p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{event.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.type} · {event.source}
                        </p>
                      </div>
                      <Badge variant="outline" className="px-2.5 py-1 text-xs">
                        {new Date(event.timestamp).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      {typeof amount === "number" && (
                        <div>Amount: {formatUsdFromCents(amount)}</div>
                      )}
                      {typeof itemCount === "number" && (
                        <div>Items: {itemCount}</div>
                      )}
                      {typeof sessionId === "string" && (
                        <div className="break-all">Session: {sessionId}</div>
                      )}
                      {typeof transactionId === "string" && (
                        <div className="break-all">
                          Payment Intent: {transactionId}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default PaymentsPage;
