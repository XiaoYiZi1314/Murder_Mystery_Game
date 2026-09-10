import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type SharedProps = {
  children?: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};
export type ButtonProps = SharedProps &
  (
    | ({ href: string } & AnchorHTMLAttributes<HTMLAnchorElement>)
    | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
  );

export function Button(props: ButtonProps) {
  const { variant = "primary", className, ...buttonProps } = props;
  const classes = cn("btn", `btn-${variant}`, className);
  if (typeof buttonProps.href === "string") {
    const { href, children, loading, ...rest } = buttonProps;
    return (
      <Link
        {...rest}
        href={href}
        className={classes}
        aria-busy={loading || undefined}
      >
        {children}
      </Link>
    );
  }
  const { children, loading, type = "button", ...rest } = buttonProps;
  return (
    <button
      {...rest}
      type={type}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {children}
    </button>
  );
}
