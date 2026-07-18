import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-4 py-12 text-center">
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        404
      </span>
      <div className="space-y-2">
        <h1 className="font-serif text-4xl font-semibold tracking-[-0.035em]">
          This page is no longer here.
        </h1>
        <p className="text-sm text-muted-foreground">
          The product, route, or resource you requested could not be found.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button href="/products">Browse products</Button>
        <Button href="/" variant="outline">
          Back to storefront
        </Button>
      </div>
    </section>
  );
}
