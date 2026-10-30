import type { HTMLAttributes } from "react";
import clsx from "clsx";

export type BadgeVariant = "neutral" | "info" | "warning" | "success" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-scope2-light text-scope2-dark",
  warning: "bg-warning-light text-warning-dark",
  success: "bg-success-light text-success-dark",
  danger: "bg-danger-light text-danger-dark",
};

export function Badge({ variant = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
