import {
  getOrderServiceHealth,
  getOrderServiceServerUrl,
  getOrderServiceUrl,
  getPaymentServiceHealth,
  getPaymentServiceServerUrl,
  getPaymentServiceUrl,
  getProductServiceHealth,
  getProductServiceServerUrl,
  getProductServiceUrl,
} from "@repo/api-client";
import { connection } from "next/server";
import { createStoreMetadata } from "@/lib/metadata";

export const metadata = createStoreMetadata({
  title: "Platform status",
  description:
    "Current availability for the public services that power the storefront.",
  noIndex: true,
});

const liveFetchOptions = {
  cache: "no-store" as const,
};

const services = [
  {
    name: "Product service",
    publicBaseUrl: getProductServiceUrl(),
    serverBaseUrl: getProductServiceServerUrl(),
    health: getProductServiceHealth,
  },
  {
    name: "Order service",
    publicBaseUrl: getOrderServiceUrl(),
    serverBaseUrl: getOrderServiceServerUrl(),
    health: getOrderServiceHealth,
  },
  {
    name: "Payment service",
    publicBaseUrl: getPaymentServiceUrl(),
    serverBaseUrl: getPaymentServiceServerUrl(),
    health: getPaymentServiceHealth,
  },
] as const;

const DiagnosticsPage = async () => {
  await connection();

  const snapshots = await Promise.all(
    services.map(async (service) => {
      try {
        const health = await service.health(
          service.serverBaseUrl,
          liveFetchOptions,
        );

        return {
          name: service.name,
          publicBaseUrl: service.publicBaseUrl,
          health,
          error: null,
        };
      } catch {
        return {
          name: service.name,
          publicBaseUrl: service.publicBaseUrl,
          health: null,
          error: true,
        };
      }
    }),
  );

  return (
    <div className="space-y-8 pb-10 pt-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          System availability
        </p>
        <h1 className="font-serif text-5xl font-semibold tracking-[-0.045em] text-foreground sm:text-6xl">
          Platform status
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Live availability for the public catalog, order, and payment services
          used by this storefront. Operational event data remains restricted to
          authorized administrators.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {snapshots.map((snapshot) => (
          <section
            key={snapshot.name}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-foreground">
                  {snapshot.name}
                </h2>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {snapshot.publicBaseUrl}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  snapshot.health?.ready
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {snapshot.health?.ready ? "Operational" : "Unavailable"}
              </span>
            </div>

            {snapshot.error ? (
              <p className="mt-5 rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                Status is temporarily unavailable. The service may be starting
                or undergoing maintenance.
              </p>
            ) : (
              <dl className="mt-5 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Readiness</dt>
                  <dd className="font-medium text-foreground">
                    {snapshot.health?.ready ? "Ready" : "Degraded"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Uptime</dt>
                  <dd className="font-medium text-foreground">
                    {Math.floor(snapshot.health?.uptimeSeconds ?? 0)} seconds
                  </dd>
                </div>
              </dl>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default DiagnosticsPage;
