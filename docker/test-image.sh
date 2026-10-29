#!/usr/bin/env bash
# Run the built artifact with the same filesystem/user restrictions as the chart.
set -euo pipefail

service=${1:?Usage: bash docker/test-image.sh SERVICE IMAGE}
image=${2:?Usage: bash docker/test-image.sh SERVICE IMAGE}
case "$service" in
  client) port=3002 ;;
  admin) port=3003 ;;
  product-service|order-service|payment-service) port=0 ;;
  *) echo "Unknown application: $service" >&2; exit 2 ;;
esac

runtime_args=(
  --init --read-only --user 65532:65532
  --cap-drop ALL --security-opt no-new-privileges
  --network none --tmpfs "/tmp:rw,nosuid,size=64m,mode=1777"
  --env NODE_ENV=production
  --env HTTP_PROXY=http://127.0.0.1:9 --env HTTPS_PROXY=http://127.0.0.1:9
  --env http_proxy=http://127.0.0.1:9 --env https_proxy=http://127.0.0.1:9
  --env NO_PROXY= --env no_proxy=
  --env CLERK_SECRET_KEY= --env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
)

if [ "$port" = 0 ]; then
  # Import the application without bootstrapping databases, migrations or workers.
  # All route imports must resolve from the production-only dependency layers.
  docker run --rm "${runtime_args[@]}" \
    --env DATABASE_URL=postgresql://smoke:smoke@127.0.0.1:9/smoke_test \
    --env MONGO_URL=mongodb://127.0.0.1:9/smoke_test \
    --env PAYMENT_DATABASE_URL=postgresql://smoke:smoke@127.0.0.1:9/smoke_test \
    --workdir "/app/apps/$service" --entrypoint bun "$image" -e '
      const { app } = await import("./src/app.ts");
      for (const [path, expected] of [["/health/live", 200], ["/health/ready", 503]]) {
        const response = await app.request(path);
        if (response.status !== expected)
          throw new Error(`${path}: expected ${expected}, received ${response.status}`);
        if (!(response.headers.get("cache-control") ?? "").includes("no-store"))
          throw new Error(`${path}: health responses must not be cached`);
      }
      console.log("Production imports and health routes passed.");
      process.exit(0);
    '
  exit 0
fi

container=
cleanup() {
  status=$?
  trap - EXIT
  if [ -n "$container" ]; then
    if [ "$status" -ne 0 ]; then docker logs "$container" >&2 || true; fi
    docker rm --force "$container" >/dev/null || true
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
container=$(docker run --detach "${runtime_args[@]}" \
  --tmpfs "/app/apps/$service/.next/cache:rw,nosuid,size=256m,mode=1777" \
  --env "PORT=$port" --env HOSTNAME=0.0.0.0 \
  --env PRODUCT_SERVICE_INTERNAL_URL=http://127.0.0.1:9 \
  --env ORDER_SERVICE_INTERNAL_URL=http://127.0.0.1:9 \
  --env PAYMENT_SERVICE_INTERNAL_URL=http://127.0.0.1:9 \
  "$image")

# Fetch inside the isolated container; no published host port or external service.
docker exec --env "SMOKE_APP=$service" "$container" bun -e '
  const app = process.env.SMOKE_APP;
  const origin = `http://127.0.0.1:${process.env.PORT}`;
  const request = (path, timeout = 15000) => fetch(new URL(path, origin), {
    proxy: false, signal: AbortSignal.timeout(timeout), redirect: "manual",
  });
  let healthy = false;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await request("/api/health", 1000);
      if (response.ok && (await response.json()).service === app) {
        healthy = true;
        break;
      }
    } catch {}
    await Bun.sleep(200);
  }
  if (!healthy) throw new Error(`${app}: standalone server did not become healthy`);
  const page = app === "client" ? "/cart" : "/users/smoke-test";
  const response = await request(page);
  const html = await response.text();
  if (app === "client" ? response.status !== 200 : ![200, 404].includes(response.status))
    throw new Error(`${page}: unexpected status ${response.status}`);
  if (app === "admin" && !html.includes("Admin route not found"))
    throw new Error("Unauthenticated admin access must fail closed");
  if (!html.includes("rel=\"stylesheet\"")) throw new Error(`${page}: missing stylesheet`);
  const assets = new Set([...html.matchAll(/(?:href|src)="([^"\s]*\/_next\/static\/[^"\s]+)"/g)]
    .map((match) => match[1].replaceAll("&amp;", "&")));
  if (!assets.size) throw new Error(`${page}: no standalone assets found`);
  for (const asset of assets) {
    const result = await request(asset);
    if (!result.ok || !(await result.arrayBuffer()).byteLength)
      throw new Error(`Missing or empty standalone asset: ${asset}`);
  }
  const optimized = await request("/_next/image?url=%2Flogo.png&w=64&q=75");
  if (!optimized.ok || !optimized.headers.get("content-type")?.startsWith("image/") ||
      !(await optimized.arrayBuffer()).byteLength)
    throw new Error(`${app}: native image optimization failed (${optimized.status})`);
  console.log(`${app}: health, page, ${assets.size} assets and native image optimization passed.`);
'
