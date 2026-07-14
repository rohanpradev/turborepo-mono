import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({
  className,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-full border border-stone-500 bg-white/90 px-4 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-500 focus-visible:border-orange-700 focus-visible:ring-2 focus-visible:ring-orange-700/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
