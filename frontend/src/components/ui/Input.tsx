import { forwardRef, useId, type InputHTMLAttributes } from "react";
import clsx from "clsx";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  warning?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, warning, hint, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = error || warning || hint ? `${inputId}-desc` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={descId}
        className={clsx(
          "w-full rounded-md border px-3 py-1.5 text-sm text-slate-900 shadow-sm",
          "placeholder:text-slate-400 focus:outline-none focus:ring-2",
          error
            ? "border-danger focus:border-danger focus:ring-danger/30"
            : warning
              ? "border-warning focus:border-warning focus:ring-warning/30"
              : "border-slate-300 focus:border-brand focus:ring-brand/30",
          "disabled:bg-slate-100 disabled:text-slate-500",
          className,
        )}
        {...rest}
      />
      {error && (
        <p id={descId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      {!error && warning && (
        <p id={descId} className="text-xs text-warning-dark">
          ⚠ {warning}
        </p>
      )}
      {!error && !warning && hint && (
        <p id={descId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
});
