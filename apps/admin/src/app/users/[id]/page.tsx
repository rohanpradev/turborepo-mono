import { formatUsdFromCents } from "@repo/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildCustomerSummaries,
  buildPaymentActivities,
  formatCustomerLabel,
  formatTimestamp,
  loadOptionalAdminOrders,
  loadPaymentEvents,
} from "@/lib/admin-data";
import { requireAdminAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UserDetailsPage = async ({ params }: PageProps<"/users/[id]">) => {
  await requireAdminAccess();
  const { id } = await params;
  const [events, orders] = await Promise.all([
    loadPaymentEvents(),
    loadOptionalAdminOrders(),
  ]);
  const customerOrders = (orders ?? []).filter((order) => order.userId === id);

  const activities = buildPaymentActivities(events);
  const customerActivities = activities.filter(
    (activity) => activity.userId === id,
  );
  const customer = buildCustomerSummaries(
    customerActivities,
    customerOrders,
  )[0];

  if (!customer) {
    notFound();
  }

  return (
    <section className="space-y-6 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <Link href="/users" className="text-sm underline">
          Back to customer directory
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Customer Profile
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {formatCustomerLabel(customer.userId)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {customer.email ?? "Email unavailable from current live activity"}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
            {customer.paymentCount} completed payment
            {customer.paymentCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Lifetime Revenue
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {formatUsdFromCents(customer.revenueCents)}
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Average Order Value
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {formatUsdFromCents(customer.averageOrderValueCents)}
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Total Items
          </p>
          <p className="mt-3 text-3xl font-semibold">{customer.totalItems}</p>
        </article>
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Latest Activity
          </p>
          <p className="mt-3 text-xl font-semibold">
            {formatTimestamp(customer.latestActivityAt)}
          </p>
        </article>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Placed orders</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirmed order records with the products and totals captured at
          checkout.
        </p>
        {orders === null ? (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            Order details are temporarily unavailable. Please try again shortly.
          </p>
        ) : customerOrders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No placed orders yet. A confirmed payment may take a moment to
            appear.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {customerOrders.map((order) => (
              <article key={order._id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">Order</h3>
                    <p className="mt-1 break-all font-mono text-xs">
                      {order.orderId ?? order._id}
                    </p>
                    {order.createdAt && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatTimestamp(order.createdAt)}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                    {order.status === "success" ? "Confirmed" : "Failed"}
                  </span>
                </div>
                <ul className="mt-4 divide-y">
                  {order.products.map((product, index) => (
                    <li
                      key={`${order._id}-${index}`}
                      className="flex items-start justify-between gap-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="mt-1 text-muted-foreground">
                          {product.quantity} ×{" "}
                          {formatUsdFromCents(product.price)}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium">
                        {formatUsdFromCents(product.price * product.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="border-t pt-3 text-right text-sm font-semibold">
                  Order total: {formatUsdFromCents(order.amount)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr]">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Recent Checkout Sessions</h2>
            <p className="text-sm text-muted-foreground">
              Payment session creation and confirmation activity tied to this
              customer ID.
            </p>
          </div>
          <div className="space-y-3">
            {customerActivities.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No recent checkout events. Placed orders remain available above.
              </p>
            )}
            {customerActivities.map((activity) => (
              <article
                key={activity.sessionId}
                className="rounded-xl border border-dashed p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-medium">
                      {formatUsdFromCents(activity.amountCents)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.itemCount} item
                      {activity.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      activity.status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {activity.status === "paid" ? "Paid" : "Pending"}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Session ID
                    </dt>
                    <dd className="mt-1 break-all font-mono text-xs">
                      {activity.sessionId}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Payment Intent
                    </dt>
                    <dd className="mt-1 break-all font-mono text-xs">
                      {activity.paymentIntentId ?? "Awaiting confirmation"}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs text-muted-foreground">
                  Checkout: {formatTimestamp(activity.checkoutTimestamp)}
                  {activity.completedTimestamp
                    ? ` | Paid: ${formatTimestamp(activity.completedTimestamp)}`
                    : ""}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};

export default UserDetailsPage;
