export default function Loading() {
  return (
    <section className="space-y-6 py-4" aria-label="Loading dashboard">
      <div className="h-40 animate-pulse rounded-2xl border bg-card" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl border bg-card"
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl border bg-card" />
        <div className="h-72 animate-pulse rounded-2xl border bg-card" />
      </div>
    </section>
  );
}
