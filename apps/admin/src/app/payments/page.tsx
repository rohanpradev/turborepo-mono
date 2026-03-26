import {
  getOrderServiceHealth,
  getOrderServiceServerUrl,
  getPaymentIntegrationEvents,
  getPaymentServiceHealth,
  getPaymentServiceServerUrl,
  getPaymentServiceUrl,
  getProductServiceHealth,
  getProductServiceServerUrl,
  type OrderHealthResponse,
  type PaymentHealthResponse,
  type ProductHealthResponse,
} from "@repo/api-client";
import { formatUsdFromCents } from "@repo/types";
import Link from "next/link";

const liveFetchOptions = {
  cache: "no-store" as const,
};

type ServiceSnapshot =
  | ProductHealthResponse
  | OrderHealthResponse
  | PaymentHealthResponse;

const PaymentsPage = async () => {
  const paymentServiceUrl = getPaymentServiceServerUrl();
  const paymentServicePublicUrl = getPaymentServiceUrl();
  const productServiceUrl = getProductServiceServerUrl();
  const orderServiceUrl = getOrderServiceServerUrl();

  const [paymentHealth, productHealth, orderHealth, paymentEvents] =
    await Promise.all([
      getPaymentServiceHealth(paymentServiceUrl, liveFetchOptions).catch(
        (error) => ({
          error:
            error instanceof Error
              ? error.message
              : "Unable to load payment service health.",
        }),
      ),
      getProductServiceHealth(productServiceUrl, liveFetchOptions).catch(
        (error) => ({
          error:
            error instanceof Error
              ? error.message
              : "Unable to load product service health.",
        }),
      ),
      getOrderServiceHealth(orderServiceUrl, liveFetchOptions).catch(
        (error) => ({
          error:
            error instanceof Error
              ? error.message
              : "Unable to load order service health.",
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

  const healthCards = [
    {
      label: "Payment Service",
      snapshot: paymentHealth,
      url: paymentServiceUrl,
    },
    {
      label: "Product Service",
      snapshot: productHealth,
      url: productServiceUrl,
    },
    {
      label: "Order Service",
      snapshot: orderHealth,
      url: orderServiceUrl,
    },
  ] as const;

  const eventPayload = "data" in paymentEvents ? paymentEvents.data : null;
  const recentEvents = eventPayload?.recentEvents ?? [];
  const successfulPayments = recentEvents.filter(
    (event) => event.type === "payment.successful.published",
  );
  const checkoutSessions = recentEvents.filter(
    (event) => event.type === "checkout.session.created",
  );
  const catalogSyncs = recentEvents.filter(
    (event) => event.type === "catalog.synced",
  );
  const recentRevenueCents = successfulPayments.reduce((total, event) => {
    const amount = event.details?.amount;
    return total + (typeof amount === "number" ? amount : 0);
  }, 0);

  const renderHealthState = (snapshot: ServiceSnapshot) =>
    snapshot.ready ? "Ready" : "Degraded";

  return (
    <section className="space-y-6 py-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Payments Control Room
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Live checkout and Kafka event flow
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              This page is wired to live service endpoints and recent payment
              integration events. It shows the Kafka-driven flow from
              catalog-sync through Stripe checkout to downstream order creation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="https://kafka.localhost" className="underline">
              Kafka UI
            </Link>
            <Link
              href="https://dashboard.localhost/dashboard/"
              className="underline"
            >
              Traefik Dashboard
            </Link>
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
            Recent `payment.successful` Kafka publishes observed by the payment
            service.
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
            Stripe checkout sessions created by the live payment service.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Catalog Syncs
          </p>
          <p className="mt-3 text-3xl font-semibold">{catalogSyncs.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Product catalog events consumed from Kafka and mirrored into Stripe.
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Service Chain</h2>
            <p className="text-sm text-muted-foreground">
              Product events enter through Kafka, checkout runs through Stripe,
              and successful payment events flow downstream to orders.
            </p>
          </div>

          <div className="space-y-3">
            {healthCards.map((card) => (
              <article
                key={card.label}
                className="rounded-xl border border-dashed p-4"
              >
                {"error" in card.snapshot ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium">{card.label}</h3>
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                        Offline
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-red-700">
                      {card.snapshot.error}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{card.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {card.snapshot.service}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          card.snapshot.ready
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {renderHealthState(card.snapshot)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {card.url}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.snapshot.dependencies.map((dependency) => (
                        <span
                          key={`${card.label}-${dependency.name}`}
                          className="rounded-full border px-2.5 py-1 text-xs"
                        >
                          {dependency.name}: {dependency.status}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Kafka and Stripe Timeline
              </h2>
              <p className="text-sm text-muted-foreground">
                Recent upstream Kafka, Stripe, checkout, and webhook events from
                the payment service.
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
          ) : recentEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No payment integration events recorded yet. Start the stack,
              publish a product event, or create a checkout session to populate
              the live feed.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Event</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event) => (
                    <tr key={event.id} className="border-t align-top">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border px-2.5 py-1 text-xs">
                          {event.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{event.message}</div>
                        <div className="text-xs text-muted-foreground">
                          {event.type}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {event.details ? (
                          <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        ) : (
                          "No extra metadata"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default PaymentsPage;
