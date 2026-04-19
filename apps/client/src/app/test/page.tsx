import {
  getOrderServiceHealth,
  getOrderServiceServerUrl,
  getOrderServiceUrl,
  getPaymentIntegrationEvents,
  getPaymentServiceHealth,
  getPaymentServiceServerUrl,
  getPaymentServiceUrl,
  getProductServiceHealth,
  getProductServiceServerUrl,
  getProductServiceUrl,
} from "@repo/api-client";
import type { Metadata } from "next";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Diagnostics",
  description:
    "Live service health, documentation links, and payment integration events for the storefront stack.",
};

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

const TestPage = async () => {
  await connection();

  const paymentEvents = await getPaymentIntegrationEvents(
    getPaymentServiceServerUrl(),
    liveFetchOptions,
  ).catch((error) => ({
    error:
      error instanceof Error
        ? error.message
        : "Unable to load payment integration events.",
    data: null,
  }));

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
          serverBaseUrl: service.serverBaseUrl,
          health,
          error: null,
        };
      } catch (error) {
        return {
          name: service.name,
          publicBaseUrl: service.publicBaseUrl,
          serverBaseUrl: service.serverBaseUrl,
          health: null,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load service diagnostics.",
        };
      }
    }),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Platform Diagnostics</h1>
        <p className="text-sm text-gray-500">
          Live service health and documentation endpoints for the storefront
          stack.
        </p>
        <div className="flex flex-wrap gap-3 pt-2 text-sm">
          <a href="https://kafka.localhost" className="underline">
            Kafka UI
          </a>
          <a
            href="https://dashboard.localhost/dashboard/"
            className="underline"
          >
            Traefik Dashboard
          </a>
        </div>
      </div>

      <div className="grid gap-4">
        {snapshots.map((snapshot) => (
          <section
            key={snapshot.name}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-medium">{snapshot.name}</h2>
                <p className="text-sm text-gray-500">
                  Internal: {snapshot.serverBaseUrl}
                </p>
                <p className="text-sm text-gray-500">
                  Public: {snapshot.publicBaseUrl}
                </p>
              </div>
            </div>

            {snapshot.error ? (
              <p className="mt-4 rounded-md border border-dashed border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {snapshot.error}
              </p>
            ) : (
              <pre className="mt-4 overflow-auto rounded-md bg-gray-950 p-4 text-xs text-gray-50">
                {JSON.stringify(snapshot.health, null, 2)}
              </pre>
            )}
          </section>
        ))}
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">Payment Integration Events</h2>
            <p className="text-sm text-gray-500">
              Recent Kafka, Stripe, checkout, and webhook activity from the
              payment service.
            </p>
          </div>
          {"data" in paymentEvents && paymentEvents.data ? (
            <a
              href={paymentEvents.data.kafkaUiUrl}
              className="text-sm font-medium text-black underline"
            >
              Open Kafka UI
            </a>
          ) : null}
        </div>

        {"error" in paymentEvents && paymentEvents.error ? (
          <p className="mt-4 rounded-md border border-dashed border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {paymentEvents.error}
          </p>
        ) : (
          <pre className="mt-4 overflow-auto rounded-md bg-gray-950 p-4 text-xs text-gray-50">
            {JSON.stringify(paymentEvents.data, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
};

export default TestPage;
