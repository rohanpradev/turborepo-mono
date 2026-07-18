import type * as React from "react";

import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "outline";
};

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "border-transparent bg-foreground text-background",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "border-border bg-transparent text-muted-foreground",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 focus-visible:ring-offset-2",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
