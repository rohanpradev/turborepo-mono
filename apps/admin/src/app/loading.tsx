export default function Loading() {
  return (
    <section className="space-y-6 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-9 max-w-xl animate-pulse rounded-full bg-muted" />
          <div className="h-4 max-w-2xl animate-pulse rounded-full bg-muted" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl border bg-card shadow-sm"
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.5fr]">
        <div className="h-96 animate-pulse rounded-2xl border bg-card shadow-sm" />
        <div className="h-96 animate-pulse rounded-2xl border bg-card shadow-sm" />
      </div>
    </section>
  );
}
