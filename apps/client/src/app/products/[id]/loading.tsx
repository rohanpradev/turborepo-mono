export default function ProductLoading() {
  return (
    <div className="grid min-w-0 gap-7 pb-12 pt-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-10 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <div className="space-y-4">
        <div className="aspect-[4/5] rounded-2xl border border-border bg-card">
          <div className="h-full rounded-2xl bg-muted motion-safe:animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square rounded-lg bg-muted motion-safe:animate-pulse"
            />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="h-4 w-32 rounded-full bg-muted motion-safe:animate-pulse" />
        <div className="mt-5 h-12 w-3/4 rounded-lg bg-muted motion-safe:animate-pulse" />
        <div className="mt-4 space-y-2">
          <div className="h-4 rounded-full bg-muted motion-safe:animate-pulse" />
          <div className="h-4 w-5/6 rounded-full bg-muted motion-safe:animate-pulse" />
          <div className="h-4 w-2/3 rounded-full bg-muted motion-safe:animate-pulse" />
        </div>
        <div className="my-6 h-px bg-border" />
        <div className="grid gap-3">
          <div className="h-10 rounded-lg bg-muted motion-safe:animate-pulse" />
          <div className="h-10 rounded-lg bg-muted motion-safe:animate-pulse" />
          <div className="h-10 rounded-lg bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}
