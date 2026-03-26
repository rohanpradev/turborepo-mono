type IntegrationEventValue = string | number | boolean | null;

export type IntegrationEvent = {
  id: string;
  source: "service" | "kafka" | "stripe" | "checkout" | "webhook";
  type: string;
  message: string;
  timestamp: string;
  details?: Record<string, IntegrationEventValue>;
};

const MAX_EVENTS = 50;

const globalState = globalThis as typeof globalThis & {
  paymentIntegrationEvents?: Array<IntegrationEvent>;
};

const events = globalState.paymentIntegrationEvents ?? [];
globalState.paymentIntegrationEvents = events;

export const recordIntegrationEvent = (
  event: Omit<IntegrationEvent, "id" | "timestamp">,
) => {
  events.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...event,
  });

  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }
};

export const listIntegrationEvents = (limit = 20) => events.slice(0, limit);
