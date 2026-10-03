/** One non-overlapping loop. Stop cancels scheduling and waits for active work. */
export const startBackgroundTask = (
  run: () => Promise<void>,
  intervalMs: number,
  onError: (error: unknown) => void,
) => {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: Promise<void>;
  const tick = async () => {
    try {
      await run();
    } catch (error) {
      if (!stopped) onError(error);
    }
    if (!stopped)
      timer = setTimeout(() => {
        active = tick();
      }, intervalMs);
  };
  active = tick();
  return async () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    await active;
  };
};
