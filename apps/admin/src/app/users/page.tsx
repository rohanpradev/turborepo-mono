import { formatUsdFromCents } from "@repo/types";
import type { Metadata } from "next";
import Link from "next/link";
import {
  buildCustomerSummaries,
  buildPaymentActivities,
  formatCustomerLabel,
  formatTimestamp,
  loadOptionalAdminOrders,
  loadPaymentEvents,
} from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customers",
  description:
    "Customer revenue, payment history, and checkout activity derived from live commerce events.",
};

const UsersPage = async () => {
  const [events, orders] = await Promise.all([
    loadPaymentEvents(),
    loadOptionalAdminOrders(),
  ]);

  const activities = buildPaymentActivities(events);
  const customers = buildCustomerSummaries(activities, orders ?? []);
  const paidActivities = activities.filter(
    (activity) => activity.status === "paid",
  );
  const totalRevenueCents = customers.reduce(
    (total, customer) => total + customer.revenueCents,
    0,
  );
  const averageRevenueCents =
    customers.length > 0 ? Math.round(totalRevenueCents / customers.length) : 0;

  return (
    <section className="space-y-6 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Customer Activity
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Live customer directory from checkout behavior
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              This page is derived from real checkout and payment events.
              Customer revenue and payment counts come from successful payments,
              with order-service data layered in when the signed-in admin token
              is authorized to read it.
            </p>
          </div>
          <Link href="/payments" className="text-sm underline">
            Review payment pipeline
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Active Customers
          </p>
          <p className="mt-3 text-3xl font-semibold">{customers.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Distinct user IDs observed in the current live activity window.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Paid Sessions
          </p>
          <p className="mt-3 text-3xl font-semibold">{paidActivities.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Successful checkout sessions that published `payment.successful`.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Aggregate Revenue
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {formatUsdFromCents(totalRevenueCents)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Revenue currently visible from recent customer activity.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Avg Revenue / Customer
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {formatUsdFromCents(averageRevenueCents)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Average value across customers in the current live window.
          </p>
        </article>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Customer Directory</h2>
            <p className="text-sm text-muted-foreground">
              Drill into a customer to inspect their recent checkout sessions
              and payment confirmations.
            </p>
          </div>
          {orders ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Order-service enrichment enabled
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              Showing event-derived customer data
            </span>
          )}
        </div>

        <div className="space-y-3">
          {customers.length > 0 ? (
            customers.map((customer) => (
              <article
                key={customer.userId}
                className="rounded-xl border border-dashed p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Link
                      href={`/users/${customer.userId}`}
                      className="text-base font-medium underline"
                    >
                      {formatCustomerLabel(customer.userId)}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {customer.email ??
                        "Email unavailable from live event stream"}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                    {customer.paymentCount} paid session
                    {customer.paymentCount === 1 ? "" : "s"}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 md:grid-cols-4">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Revenue
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatUsdFromCents(customer.revenueCents)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Avg Order
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatUsdFromCents(customer.averageOrderValueCents)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Items
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {customer.totalItems}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Latest Activity
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatTimestamp(customer.latestActivityAt)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No customer activity has been observed yet. Create a checkout
              session from the storefront and complete payment to populate this
              view.
            </div>
          )}
        </div>
      </section>
    </section>
  );
};

export default UsersPage;
