import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-4 py-12 text-center">
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
        404
      </span>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          This page is no longer here.
        </h1>
        <p className="text-sm text-gray-500">
          The product, route, or resource you requested could not be found.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/products"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Browse products
        </Link>
        <Link
          href="/"
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
        >
          Back to storefront
        </Link>
      </div>
    </section>
  );
}
