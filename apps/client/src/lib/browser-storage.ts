type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Keep this visit usable when browser storage is denied or its quota is full. */
export const createBrowserStorage = (
  getStorage: () => BrowserStorage,
): BrowserStorage => {
  const memory = new Map<string, string>();
  let storage: BrowserStorage | undefined;
  let unavailable = false;
  const resolveStorage = () => (storage ??= getStorage());

  return {
    getItem(key) {
      if (!unavailable) {
        try {
          const value = resolveStorage().getItem(key);
          if (value === null) memory.delete(key);
          else memory.set(key, value);
          return value;
        } catch {
          unavailable = true;
        }
      }
      return memory.get(key) ?? null;
    },
    setItem(key, value) {
      memory.set(key, value);
      if (!unavailable) {
        try {
          resolveStorage().setItem(key, value);
        } catch {
          // Stay in memory after a failure so stale persisted values cannot return.
          unavailable = true;
        }
      }
    },
    removeItem(key) {
      memory.delete(key);
      if (!unavailable) {
        try {
          resolveStorage().removeItem(key);
        } catch {
          unavailable = true;
        }
      }
    },
  };
};
