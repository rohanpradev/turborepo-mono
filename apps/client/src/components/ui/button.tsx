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
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px";

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-foreground text-background shadow-sm hover:bg-foreground/88",
  glass:
    "border border-white/25 bg-white/10 text-white shadow-sm backdrop-blur hover:bg-white/16",
  light:
    "bg-white text-stone-950 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.7)] hover:bg-orange-50",
  outline:
    "border border-border bg-card text-card-foreground shadow-xs hover:border-foreground/25 hover:bg-muted",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-accent",
  ghost: "text-foreground hover:bg-muted hover:text-foreground",
  link: "text-foreground underline-offset-4 hover:underline",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3.5 text-xs",
  lg: "h-11 px-5 text-sm",
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
