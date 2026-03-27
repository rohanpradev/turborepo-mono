import {
  getOrderServiceHealth,
  getOrderServiceServerUrl,
  getPaymentIntegrationEvents,
  getPaymentServiceHealth,
  getPaymentServiceServerUrl,
  getProductServiceHealth,
  getProductServiceServerUrl,
  listProducts,
} from "@repo/api-client";
import { formatUsdFromCents } from "@repo/types";
import Image from "next/image";
import Link from "next/link";
import { getStorefrontAssetUrl } from "@/lib/admin-data";

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
  const productServiceUrl = getProductServiceServerUrl();
  const orderServiceUrl = getOrderServiceServerUrl();

  const [paymentEvents, products, paymentHealth, productHealth, orderHealth] =
    await Promise.all([
      getPaymentIntegrationEvents(paymentServiceUrl, liveFetchOptions).catch(
        (error) => ({
          error:
            error instanceof Error
              ? error.message
              : "Unable to load payment integration events.",
        }),
      ),
      listProducts(
        productServiceUrl,
        { limit: 4, sort: "newest" },
        liveFetchOptions,
      ).catch((error) => ({
        error:
          error instanceof Error
            ? error.message
            : "Unable to load product catalog.",
      })),
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
    ]);

  const recentEvents =
    "data" in paymentEvents ? paymentEvents.data.recentEvents : [];
  const recentPayments = recentEvents.filter(
    (event) => event.type === "payment.successful.published",
  );
  const recentCheckouts = recentEvents.filter(
    (event) => event.type === "checkout.session.created",
  );
  const recentRevenueCents = recentPayments.reduce((total, event) => {
    const amount = event.details?.amount;
    return total + (typeof amount === "number" ? amount : 0);
  }, 0);

  const featuredProducts = "data" in products ? products.data : [];
  const services = [
    { label: "Payment", snapshot: paymentHealth },
    { label: "Product", snapshot: productHealth },
    { label: "Order", snapshot: orderHealth },
  ] as const;

  return (
    <section className="space-y-6 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Admin Dashboard
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Live revenue and transaction visibility
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              The dashboard is now driven by the live payment event stream and
              product catalog. Successful Stripe checkouts appear here after the
              webhook publishes `payment.successful`.
            </p>
          </div>
          <Link href="/payments" className="text-sm underline">
            Open payments control room
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Latest Transactions
          </p>
          <p className="mt-3 text-3xl font-semibold">{recentPayments.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Recent `payment.successful` events observed by the payment service.
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
            Stripe checkout sessions created by the current payment-service
            process.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Catalog Snapshot
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {featuredProducts.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Latest products currently loaded from the catalog service.
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Latest Transactions</h2>
              <p className="text-sm text-muted-foreground">
                Live payment events published after Stripe webhook completion.
              </p>
            </div>
            <Link href="/payments" className="text-sm underline">
              View full timeline
            </Link>
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
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Success
                      </span>
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

        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Service Status</h2>
              <p className="text-sm text-muted-foreground">
                Current runtime health for the live checkout chain.
              </p>
            </div>
            <div className="space-y-3">
              {services.map((service) => (
                <article
                  key={service.label}
                  className="flex items-center justify-between rounded-xl border border-dashed p-4"
                >
                  <div>
                    <p className="font-medium">{service.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {"error" in service.snapshot
                        ? service.snapshot.error
                        : service.snapshot.service}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      "error" in service.snapshot
                        ? "bg-red-100 text-red-700"
                        : service.snapshot.ready
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {"error" in service.snapshot
                      ? "Offline"
                      : service.snapshot.ready
                        ? "Ready"
                        : "Degraded"}
                  </span>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Latest Products</h2>
              <p className="text-sm text-muted-foreground">
                Recent products currently available in the storefront catalog.
              </p>
            </div>
            <div className="space-y-3">
              {"error" in products ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-red-700">
                  {products.error}
                </div>
              ) : (
                featuredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="flex items-center gap-3 rounded-xl border border-dashed p-3"
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={getStorefrontAssetUrl(
                          Object.values(product.images)[0] ?? "/logo.svg",
                        )}
                        alt={product.name}
                        fill
                        unoptimized
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.categorySlug}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatUsdFromCents(product.price)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};

export default HomePage;
