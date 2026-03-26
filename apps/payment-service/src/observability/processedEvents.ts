const WEBHOOK_TTL_MS = 1000 * 60 * 60 * 24;

const globalState = globalThis as typeof globalThis & {
  processedPaymentEvents?: Map<string, number>;
};

const processedEvents = globalState.processedPaymentEvents ?? new Map();
globalState.processedPaymentEvents = processedEvents;

const pruneExpired = () => {
  const now = Date.now();

  for (const [key, expiresAt] of processedEvents.entries()) {
    if (expiresAt <= now) {
      processedEvents.delete(key);
    }
  }
};

export const registerProcessedEvent = (key: string) => {
  pruneExpired();

  if (processedEvents.has(key)) {
    return false;
  }

  processedEvents.set(key, Date.now() + WEBHOOK_TTL_MS);
  return true;
};
