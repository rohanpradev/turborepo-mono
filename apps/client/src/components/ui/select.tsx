import { ChevronDown } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Select({
  className,
  wrapperClassName,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
}) {
  return (
    <div data-slot="select" className={cn("relative w-full", wrapperClassName)}>
      <select
        className={cn(
          "flex h-10 w-full appearance-none rounded-lg border border-input bg-card px-3.5 pr-10 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow,background-color] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { Select };
