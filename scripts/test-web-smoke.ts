import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const apps = [
  {
    name: "client",
    pages: [
      { path: "/", status: 200 },
      { path: "/products", status: 200 },
      { path: "/cart", status: 200 },
      { path: "/orders", status: 200 },
      { path: "/return", status: 200 },
    ],
  },
  // The real dashboard must fail closed without configured authentication.
  {
    name: "admin",
    pages: [
      { path: "/", status: 200 },
      { path: "/ui-review", status: 200 },
      { path: "/products", status: 200 },
      { path: "/payments", status: 200 },
      { path: "/users", status: 200 },
      { path: "/users/smoke-test", status: 200 },
    ],
  },
] as const;

for (const app of apps) {
  const source = path.join(root, "apps", app.name);
  const standalone = path.join(source, ".next/standalone/apps", app.name);
  const entry = path.join(standalone, "server.js");
  if (!(await Bun.file(entry).exists()))
    throw new Error(`Build ${app.name} before running test:web.`);
  // Mirror Docker's standalone asset layout. These are generated build files.
  await mkdir(path.join(standalone, ".next/static"), { recursive: true });
  await cp(
    path.join(source, ".next/static"),
    path.join(standalone, ".next/static"),
    { recursive: true },
  );
  await cp(path.join(source, "public"), path.join(standalone, "public"), {
    recursive: true,
  });

  const reservation = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () => new Response(),
  });
  const port = reservation.port;
  await reservation.stop(true);
  const origin = `http://127.0.0.1:${port}`;
  let catalogEnabled = false;
  let available: number | null = 5;
  const stockGate = Promise.withResolvers<void>();
  const fixture = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const pathname = new URL(request.url).pathname;
      if (!catalogEnabled)
        return new Response("Catalog unavailable", { status: 503 });
      if (pathname.endsWith("/product/get")) {
        return Response.json({
          json: {
            success: true,
            data: {
              id: 1,
              name: "Upgrade streaming fixture",
              shortDescription: "Streaming test product",
              description:
                "Product details should arrive before the stock check.",
              price: 1999,
              sizes: ["m"],
              colors: ["black"],
              images: { black: "/products/1g.png" },
              categorySlug: "test",
              createdAt: "2026-10-10T00:00:00.000Z",
              updatedAt: "2026-10-10T00:00:00.000Z",
            },
          },
        });
      }
      if (pathname.endsWith("/inventory/availability")) {
        await stockGate.promise;
        if (available === null)
          return new Response("Stock unavailable", { status: 503 });
        return Response.json({
          json: {
            success: true,
            data: [{ size: "m", color: "black", available }],
          },
        });
      }
      return new Response("Unknown fixture route", { status: 404 });
    },
  });
  const child = Bun.spawn([process.execPath, entry], {
    cwd: standalone,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NEXT_TELEMETRY_DISABLED: "1",
      CLERK_SECRET_KEY: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      PRODUCT_SERVICE_INTERNAL_URL: `http://127.0.0.1:${fixture.port}`,
      PAYMENT_SERVICE_INTERNAL_URL: "http://127.0.0.1:9",
      ORDER_SERVICE_INTERNAL_URL: "http://127.0.0.1:9",
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = new Response(child.stdout).text();
  const errors = new Response(child.stderr).text();
  let failed = false;
  try {
    const deadline = Date.now() + 20_000;
    let ready = false;
    while (Date.now() < deadline && child.exitCode === null) {
      try {
        const response = await fetch(`${origin}/api/health`, {
          signal: AbortSignal.timeout(1000),
        });
        if (
          response.ok &&
          ((await response.json()) as { service?: string }).service === app.name
        ) {
          ready = true;
          break;
        }
      } catch {
        /* The process may still be starting. */
      }
      await Bun.sleep(100);
    }
    if (!ready)
      throw new Error(`${app.name} standalone server did not become healthy.`);
    const assets = new Set<string>();
    for (const page of app.pages) {
      const response = await fetch(`${origin}${page.path}`, {
        signal: AbortSignal.timeout(15_000),
        redirect: "manual",
      });
      if (
        response.status !== page.status &&
        !(
          app.name === "admin" &&
          page.path !== "/ui-review" &&
          response.status === 404
        )
      )
        throw new Error(
          `${app.name}${page.path}: expected ${page.status}, received ${response.status}.`,
        );
      const html = await response.text();
      if (
        app.name === "client" &&
        page.path === "/orders" &&
        !html.includes("Order history is unavailable in this environment.")
      ) {
        throw new Error(
          "Order history did not fail closed without authentication.",
        );
      }
      // Streaming can send 200 before notFound() is reached. Check the rendered
      // denial rather than treating HTTP 200 as authorization success.
      if (
        app.name === "admin" &&
        page.path !== "/ui-review" &&
        !html.includes("Admin route not found")
      ) {
        throw new Error(
          "Unauthenticated admin dashboard did not render the not-found boundary.",
        );
      }
      if (!html.includes('rel="stylesheet"'))
        throw new Error(`${app.name}${page.path} has no stylesheet.`);
      for (const match of html.matchAll(
        /(?:href|src)="([^"\s]*\/_next\/static\/[^"\s]+)"/g,
      )) {
        if (match[1]) assets.add(match[1].replaceAll("&amp;", "&"));
      }
    }
    if (app.name === "client") {
      const response = await fetch(`${origin}/sitemap.xml`, {
        signal: AbortSignal.timeout(20_000),
      });
      const xml = await response.text();
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("xml") ||
        !xml.includes("<urlset") ||
        !xml.includes("/products</loc>")
      ) {
        throw new Error(
          "The sitemap must retain public routes during a catalog outage.",
        );
      }
    }
    if (app.name === "client") {
      catalogEnabled = true;
      const response = await fetch(`${origin}/products/1`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok || !response.body)
        throw new Error("Product fixture did not render.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let html = "";
      try {
        // The fixture holds stock indefinitely. Seeing the actual heading before
        // releasing it proves that inventory cannot block the product summary.
        while (!html.includes(">Upgrade streaming fixture</h1>")) {
          const chunk = await reader.read();
          if (chunk.done)
            throw new Error("Product summary did not stream before stock.");
          html += decoder.decode(chunk.value, { stream: true });
        }
        if (!html.includes("Loading product options"))
          throw new Error("Product options need a visible loading fallback.");
      } finally {
        stockGate.resolve();
      }
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        html += decoder.decode(chunk.value, { stream: true });
      }
      if (
        !html.includes("Stock is reserved when you start payment.") ||
        !html.includes("https://schema.org/InStock")
      )
        throw new Error(
          "Live stock and structured data did not complete the stream.",
        );
      for (const stock of [0, null]) {
        available = stock;
        const response = await fetch(`${origin}/products/1`, {
          signal: AbortSignal.timeout(15_000),
        });
        const html = await response.text();
        const expected =
          stock === 0
            ? "This size and color are out of stock."
            : "Availability is temporarily unavailable.";
        if (
          !response.ok ||
          !html.includes(expected) ||
          html.includes("https://schema.org/InStock")
        )
          throw new Error(`Stock state ${stock} reused stale availability.`);
      }
      console.log(
        "client: product summary streams before stock; current, sold-out, and unavailable stock states passed.",
      );
    }
    if (!assets.size)
      throw new Error(`${app.name} did not emit static assets.`);
    for (const asset of assets) {
      const url = new URL(asset, origin);
      if (url.origin !== origin)
        throw new Error("Smoke tests require locally served assets.");
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok)
        throw new Error(
          `${app.name} asset ${url.pathname}: HTTP ${response.status}.`,
        );
      if (
        url.pathname.endsWith(".css") &&
        !response.headers.get("content-type")?.includes("text/css")
      )
        throw new Error(`${app.name} stylesheet has an invalid Content-Type.`);
      if ((await response.arrayBuffer()).byteLength === 0)
        throw new Error(`${app.name} asset ${url.pathname} is empty.`);
    }
    console.log(
      `${app.name}: standalone health, ${app.pages.length} pages, and ${assets.size} static assets passed.`,
    );
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    stockGate.resolve();
    await fixture.stop(true);
    child.kill("SIGTERM");
    const timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
    await child.exited;
    clearTimeout(timeout);
    const logs = `${await output}\n${await errors}`;
    if (failed) console.error(logs.slice(-4000));
  }
}
