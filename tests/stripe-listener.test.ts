import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

for (const script of [
  "docker/stripe-cli-listen.sh",
  "charts/ecommerce/files/stripe-cli-listen.sh",
]) {
  for (const events of ["*", "checkout.session.completed"]) {
    test(`${script} forwards ${events} with Stripe 1.51 flags and redacts secrets`, async () => {
      const directory = await mkdtemp(join(tmpdir(), "stripe-listener-test-"));
      try {
        await writeFile(
          join(directory, "stripe"),
          '#!/bin/sh\nprintf "%s\\n" "$@" > "$TEST_ARGS_FILE"\nprintf "Ready! whsec_fixture123\\n"\n',
          { mode: 0o700 },
        );
        const child = Bun.spawn(["sh", script], {
          cwd: new URL("..", import.meta.url).pathname,
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            STRIPE_API_KEY: "sk_test_fixture",
            STRIPE_CLI_EVENTS: events,
            STRIPE_WEBHOOK_FORWARD_TO:
              "http://localhost:8002/api/webhooks/stripe",
            STRIPE_WEBHOOK_SECRET_FILE: join(directory, "webhook-secret"),
            TEST_ARGS_FILE: join(directory, "args"),
          },
          stdout: "pipe",
          stderr: "pipe",
        });
        const [output, errors, code] = await Promise.all([
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
          child.exited,
        ]);
        expect(code).toBe(0);
        const args = (await readFile(join(directory, "args"), "utf8"))
          .trim()
          .split("\n");
        expect(args.slice(0, 4)).toEqual([
          "listen",
          "--skip-update",
          "--forward-to",
          "http://localhost:8002/api/webhooks/stripe",
        ]);
        expect(args.slice(4)).toEqual(
          events === "*" ? ["--all-snapshot"] : ["--events", events],
        );
        expect(output).toContain("whsec_[REDACTED]");
        expect(output + errors).not.toContain("whsec_fixture123");
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
}
