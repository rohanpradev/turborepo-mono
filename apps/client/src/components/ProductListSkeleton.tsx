const ProductListSkeleton = ({
  itemCount = 8,
  showFilters = true,
}: {
  itemCount?: number;
  showFilters?: boolean;
}) => {
  return (
    <section className="w-full space-y-6" aria-label="Loading products">
      <div className="border-b border-border pb-6">
        <div className="h-5 w-32 rounded-full bg-muted motion-safe:animate-pulse" />
        <div className="mt-3 h-10 w-64 max-w-full rounded-lg bg-muted motion-safe:animate-pulse" />
        <div className="mt-3 h-4 max-w-xl rounded-full bg-muted motion-safe:animate-pulse" />
      </div>

      {showFilters ? (
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-9 w-24 shrink-0 rounded-full bg-muted motion-safe:animate-pulse"
            />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: itemCount }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="aspect-[4/4.6] bg-muted motion-safe:animate-pulse" />
            <div className="space-y-4 p-4">
              <div className="h-5 rounded-md bg-muted motion-safe:animate-pulse" />
              <div className="h-4 w-3/4 rounded-md bg-muted motion-safe:animate-pulse" />
              <div className="grid grid-cols-4 gap-2 border-t border-border pt-4">
                {Array.from({ length: 4 }).map((_, chipIndex) => (
                  <div
                    key={chipIndex}
                    className="h-8 rounded-full bg-muted motion-safe:animate-pulse"
                  />
                ))}
              </div>
              <div className="h-10 rounded-lg bg-muted motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductListSkeleton;
