import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-12 text-center">
      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        404
      </span>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Admin route not found
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          The dashboard page you requested does not exist, or the resource is no
          longer available in this environment.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Go to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/payments">Open payments</Link>
        </Button>
      </div>
    </section>
  );
}
