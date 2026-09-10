import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({
  as: Element = "div",
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: "div" | "article" | "section";
  variant?: "default" | "surface" | "dark";
}) {
  return (
    <Element
      {...props}
      className={cn(
        { default: "card", surface: "surface-card", dark: "dark-panel" }[
          variant
        ],
        className,
      )}
    />
  );
}

export function Badge({
  variant = "tag",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "tag" | "pill" | "status" }) {
  return <span {...props} className={cn(variant, className)} />;
}

export function EmptyState({
  title,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { title: string }) {
  return (
    <div {...props} className={cn("empty", className)}>
      <strong>{title}</strong>
      {children}
    </div>
  );
}
