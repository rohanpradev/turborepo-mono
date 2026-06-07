const ProductListSkeleton = ({
  itemCount = 8,
  showFilters = true,
}: {
  itemCount?: number;
  showFilters?: boolean;
}) => {
  return (
    <section className="w-full space-y-5" aria-label="Loading products">
      <div className="border-b border-black/10 pb-5">
        <div className="h-4 w-32 rounded-full bg-black/10 motion-safe:animate-pulse" />
        <div className="mt-3 h-8 w-64 rounded-full bg-black/10 motion-safe:animate-pulse" />
        <div className="mt-3 h-4 max-w-xl rounded-full bg-black/10 motion-safe:animate-pulse" />
      </div>

      {showFilters ? (
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-11 w-28 shrink-0 rounded-full bg-black/10 motion-safe:animate-pulse"
            />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: itemCount }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm"
          >
            <div className="aspect-[4/5] bg-black/5 motion-safe:animate-pulse" />
            <div className="space-y-4 p-4">
              <div className="h-5 rounded-full bg-black/10 motion-safe:animate-pulse" />
              <div className="h-4 w-3/4 rounded-full bg-black/10 motion-safe:animate-pulse" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, chipIndex) => (
                  <div
                    key={chipIndex}
                    className="h-8 rounded-full bg-black/10 motion-safe:animate-pulse"
                  />
                ))}
              </div>
              <div className="h-11 rounded-full bg-black/10 motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductListSkeleton;
