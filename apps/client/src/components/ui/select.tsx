import { ChevronDown } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div data-slot="select" className="relative w-full">
      <select
        className={cn(
          "flex h-11 w-full appearance-none rounded-full border border-stone-500 bg-white/90 px-4 pr-10 text-sm text-stone-950 shadow-sm outline-none transition focus-visible:border-orange-700 focus-visible:ring-2 focus-visible:ring-orange-700/30 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
    </div>
  );
}

export { Select };
