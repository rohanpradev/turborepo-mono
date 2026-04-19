import { formatUsdFromCents } from "@repo/types";
import Link from "next/link";
import {
  buildCustomerSummaries,
  buildPaymentActivities,
  formatCustomerLabel,
  formatTimestamp,
  loadPaymentEvents,
} from "@/lib/admin-data";

export const dynamic = "force-dynamic";

type UserDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const UserDetailsPage = async ({ params }: UserDetailsPageProps) => {
  const { id } = await params;
  const events = await loadPaymentEvents();

  const activities = buildPaymentActivities(events);
  const customerActivities = activities.filter(
    (activity) => activity.userId === id,
  );
  const customer = buildCustomerSummaries(customerActivities, [])[0];

  if (!customer) {
    return (
      <section className="space-y-4 py-4">
        <Link href="/users" className="text-sm underline">
          Back to customer directory
        </Link>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Customer not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No checkout activity is currently available for `{id}` in the live
            payment event stream.
          </p>
        </div>
      </section>
    );
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
