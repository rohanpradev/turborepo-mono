type ShutdownStep = {
  name: string;
  run: () => unknown;
};

/** Drain work before closing its dependencies, within the container's grace period. */
export const createShutdownHandler = ({
  name,
  onShutdown,
  steps,
  timeoutMs = 25_000,
  exit = (code: number) => process.exit(code),
  reportError = (message: string, error?: unknown) =>
    console.error(message, error ?? ""),
}: {
  name: string;
  onShutdown: (signal: string) => void;
  steps: ShutdownStep[];
  timeoutMs?: number;
  exit?: (code: number) => void;
  reportError?: (message: string, error?: unknown) => void;
}) => {
  let shutdown: Promise<void> | undefined;

  return (signal: string): Promise<void> => {
    if (shutdown) return shutdown;

    shutdown = Promise.resolve().then(async () => {
      let failed = false;
      const deadline = setTimeout(() => {
        reportError(`${name} shutdown exceeded ${timeoutMs}ms.`);
        exit(1);
      }, timeoutMs);

      try {
        try {
          onShutdown(signal);
        } catch (error) {
          failed = true;
          reportError(`${name} could not begin shutdown.`, error);
        }
        for (const step of steps) {
          try {
            await step.run();
          } catch (error) {
            failed = true;
            reportError(`${name} shutdown failed at ${step.name}.`, error);
          }
        }
      } finally {
        clearTimeout(deadline);
      }
      exit(failed ? 1 : 0);
    });

    return shutdown;
  };
};
