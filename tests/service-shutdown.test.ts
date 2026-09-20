import { describe, expect, test } from "bun:test";
import { createShutdownHandler } from "../packages/hono-utils/src/shutdown";

describe("service shutdown", () => {
  test("drains active HTTP work before closing dependencies and handles signals once", async () => {
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const events: string[] = [];
    const server = Bun.serve({
      port: 0,
      async fetch() {
        entered.resolve();
        await release.promise;
        events.push("response");
        return new Response("completed");
      },
    });
    const shutdown = createShutdownHandler({
      name: "test",
      onShutdown: () => {
        events.push("not ready");
      },
      steps: [
        { name: "HTTP", run: () => server.stop() },
        {
          name: "database",
          run: () => {
            events.push("database closed");
          },
        },
      ],
      exit: (code) => {
        events.push(`exit ${code}`);
      },
    });
    try {
      const response = fetch(server.url);
      await entered.promise;
      const first = shutdown("SIGTERM");
      expect(shutdown("SIGINT")).toBe(first);
      await Promise.resolve();
      expect(events).toEqual(["not ready"]);
      release.resolve();
      expect(await (await response).text()).toBe("completed");
      await first;
      expect(events).toEqual([
        "not ready",
        "response",
        "database closed",
        "exit 0",
      ]);
    } finally {
      release.resolve();
      await server.stop(true);
    }
  });

  test("attempts remaining cleanup after a failure and exits unsuccessfully", async () => {
    const events: string[] = [];
    const shutdown = createShutdownHandler({
      name: "test",
      onShutdown: () => {},
      steps: [
        {
          name: "consumer",
          run: () => {
            throw new Error("disconnect failed");
          },
        },
        {
          name: "database",
          run: () => {
            events.push("closed");
          },
        },
      ],
      reportError: (message) => {
        events.push(message);
      },
      exit: (code) => {
        events.push(`exit ${code}`);
      },
    });
    await shutdown("SIGTERM");
    expect(events).toEqual([
      "test shutdown failed at consumer.",
      "closed",
      "exit 1",
    ]);
  });

  test("terminates a stuck drain within its deadline", async () => {
    const child = Bun.spawn(
      [
        process.execPath,
        "-e",
        `
      import { createShutdownHandler } from "./packages/hono-utils/src/shutdown.ts";
      await createShutdownHandler({
        name: "deadline-test", timeoutMs: 20, onShutdown() {},
        steps: [{ name: "stuck", run: () => new Promise(() => {}) }],
      })("SIGTERM");
    `,
      ],
      { cwd: `${import.meta.dir}/..`, stdout: "pipe", stderr: "pipe" },
    );
    expect(await child.exited).toBe(1);
    expect(await new Response(child.stderr).text()).toContain(
      "shutdown exceeded 20ms",
    );
  });
});
