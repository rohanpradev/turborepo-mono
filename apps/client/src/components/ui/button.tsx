import type { Route } from "next";
import Link from "next/link";
import type * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: Route;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-gray-950 text-white shadow-sm hover:bg-gray-800",
  outline:
    "border border-black/10 bg-white text-gray-700 shadow-sm hover:bg-gray-50",
  secondary: "bg-gray-100 text-gray-950 hover:bg-gray-200",
  ghost: "hover:bg-gray-100 hover:text-gray-950",
  link: "text-gray-950 underline-offset-4 hover:underline",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-5 py-3",
  sm: "h-9 rounded-full px-4",
  lg: "h-11 rounded-full px-6",
  icon: "size-10",
};

function Button({
  className,
  href,
  variant = "default",
  size = "default",
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export { Button };
