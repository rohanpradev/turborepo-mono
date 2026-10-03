import {
  closePaymentStore,
  getPaymentStore,
} from "../apps/payment-service/src/storage/payment-store";
import { ProductService } from "../apps/product-service/src/services/ProductService";
import {
  connectProductDB,
  disconnectProductDB,
} from "../packages/product-db/src";

for (const name of ["DATABASE_URL", "PAYMENT_DATABASE_URL"]) {
  if (
    !process.env[name] ||
    !new URL(process.env[name] as string).pathname.endsWith("_test")
  )
    throw new Error("Benchmark requires disposable *_test databases.");
}
const pool = getPaymentStore().pool;
const slug = `benchmark-${crypto.randomUUID()}`;
const samples: number[] = [];
try {
  await connectProductDB();
  await pool.query('INSERT INTO public."Category"(name,slug) VALUES($1,$1)', [
    slug,
  ]);
  await pool.query(
    `INSERT INTO public."Product"(name,"shortDescription",description,price,sizes,colors,images,"categorySlug","updatedAt") SELECT 'Benchmark '||n,'Short description','Description',1000+n,ARRAY['m'],ARRAY['black'],'{}'::jsonb,$1,now() FROM generate_series(1,1000) n`,
    [slug],
  );
  await pool.query('ANALYZE public."Product"');
  // Warm connections and query plans before measuring 100 reads at concurrency five.
  await ProductService.getAllProducts({ category: slug, limit: 24 });
  for (let batch = 0; batch < 20; batch++)
    await Promise.all(
      Array.from({ length: 5 }, async (_, i) => {
        const start = performance.now();
        await ProductService.getAllProducts({
          category: slug,
          limit: 24,
          page: (i % 3) + 1,
          sort: batch % 2 ? "asc" : "newest",
          ...(batch % 3 === 0 ? { search: "Benchmark" } : {}),
        });
        samples.push(performance.now() - start);
      }),
    );
  samples.sort((a, b) => a - b);
  const percentile = (p: number) =>
    Number((samples[Math.ceil(samples.length * p) - 1] ?? 0).toFixed(2));
  console.log(
    JSON.stringify(
      {
        fixtureProducts: 1000,
        requests: samples.length,
        concurrency: 5,
        p50Milliseconds: percentile(0.5),
        p95Milliseconds: percentile(0.95),
        p99Milliseconds: percentile(0.99),
        scope:
          "Local catalog service/database queries; excludes HTTP, auth and production network",
      },
      null,
      2,
    ),
  );
} finally {
  await pool.query('DELETE FROM public."Product" WHERE "categorySlug"=$1', [
    slug,
  ]);
  await pool.query('DELETE FROM public."Category" WHERE slug=$1', [slug]);
  await Promise.allSettled([disconnectProductDB(), closePaymentStore()]);
}
