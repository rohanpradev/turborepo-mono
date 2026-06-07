export default function ProductLoading() {
  return (
    <div className="grid min-w-0 gap-8 pb-12 pt-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-12 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <div className="space-y-4">
        <div className="aspect-[4/5] rounded-lg border border-black/10 bg-white shadow-sm">
          <div className="h-full rounded-lg bg-black/5 motion-safe:animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square rounded-lg bg-black/10 motion-safe:animate-pulse"
            />
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-7">
        <div className="h-4 w-32 rounded-full bg-black/10 motion-safe:animate-pulse" />
        <div className="mt-5 h-12 w-3/4 rounded-full bg-black/10 motion-safe:animate-pulse" />
        <div className="mt-4 space-y-2">
          <div className="h-4 rounded-full bg-black/10 motion-safe:animate-pulse" />
          <div className="h-4 w-5/6 rounded-full bg-black/10 motion-safe:animate-pulse" />
          <div className="h-4 w-2/3 rounded-full bg-black/10 motion-safe:animate-pulse" />
        </div>
        <div className="my-6 h-px bg-black/10" />
        <div className="grid gap-3">
          <div className="h-11 rounded-full bg-black/10 motion-safe:animate-pulse" />
          <div className="h-11 rounded-full bg-black/10 motion-safe:animate-pulse" />
          <div className="h-11 rounded-full bg-black/10 motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}
