import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-busy="true"
      className={clsx("animate-pulse rounded-md bg-slate-200", className)}
      {...rest}
    />
  );
}
