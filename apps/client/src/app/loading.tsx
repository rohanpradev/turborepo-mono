export default function Loading() {
  return (
    <div className="mt-12 grid min-h-[40vh] gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-[34rem] animate-pulse rounded-[1.75rem] border border-black/5 bg-white/70 shadow-sm"
        >
          <div className="h-3/5 rounded-t-[1.75rem] bg-black/5" />
          <div className="space-y-4 p-5">
            <div className="h-5 rounded-full bg-black/5" />
            <div className="h-4 w-3/4 rounded-full bg-black/5" />
            <div className="h-11 rounded-full bg-black/5" />
            <div className="h-11 rounded-full bg-black/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
