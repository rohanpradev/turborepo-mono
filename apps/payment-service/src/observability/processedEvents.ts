const WEBHOOK_TTL_MS = 1000 * 60 * 60 * 24;

const globalState = globalThis as typeof globalThis & {
  processingPaymentEvents?: Map<string, number>;
  processedPaymentEvents?: Map<string, number>;
};

const processingEvents = globalState.processingPaymentEvents ?? new Map();
const processedEvents = globalState.processedPaymentEvents ?? new Map();
globalState.processingPaymentEvents = processingEvents;
globalState.processedPaymentEvents = processedEvents;

const pruneExpired = () => {
  const now = Date.now();

  for (const [key, expiresAt] of processingEvents.entries()) {
    if (expiresAt <= now) {
      processingEvents.delete(key);
    }
  }

  for (const [key, expiresAt] of processedEvents.entries()) {
    if (expiresAt <= now) {
      processedEvents.delete(key);
    }
  }
};

export const claimProcessableEvent = (key: string) => {
  pruneExpired();

  if (processedEvents.has(key) || processingEvents.has(key)) {
    return false;
  }

  processingEvents.set(key, Date.now() + WEBHOOK_TTL_MS);
  return true;
};

export const markEventProcessed = (key: string) => {
  pruneExpired();
  processingEvents.delete(key);
  processedEvents.set(key, Date.now() + WEBHOOK_TTL_MS);
};

export const releaseProcessableEvent = (key: string) => {
  processingEvents.delete(key);
};

export const clearProcessedEventsForTesting = () => {
  processingEvents.clear();
  processedEvents.clear();
};
