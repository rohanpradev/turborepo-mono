import type { Route } from "next";
import Link from "next/link";
import type * as React from "react";
import { cn } from "@/lib/utils";

type ButtonBaseProps = {
  className?: string;
  children?: React.ReactNode;
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "light"
    | "glass";
  size?: "default" | "sm" | "lg" | "icon";
};

type ButtonAsButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonBaseProps & {
    href?: undefined;
  };

type ButtonAsLinkProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> &
  ButtonBaseProps & {
    href: Route;
    prefetch?: boolean | null | "auto";
    replace?: boolean;
    scroll?: boolean;
  };

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const baseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-gray-950 text-white shadow-sm hover:bg-gray-800",
  glass:
    "border border-white/25 bg-white/10 text-white shadow-sm hover:bg-white/15",
  light: "bg-white text-gray-950 shadow-sm hover:bg-gray-100",
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
    const linkProps = props as Omit<
      ButtonAsLinkProps,
      "children" | "className" | "href" | "size" | "variant"
    >;

    return (
      <Link href={href} className={classes} data-slot="button" {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      data-slot="button"
      {...(props as ButtonAsButtonProps)}
    >
      {children}
    </button>
  );
}

export { Button };
