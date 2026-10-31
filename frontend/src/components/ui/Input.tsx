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
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={descId}
        className={clsx(
          "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-xs transition-all",
          "placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2",
          error
            ? "border-danger focus:border-danger focus:ring-danger/20"
            : warning
              ? "border-warning focus:border-warning focus:ring-warning/20"
              : "border-slate-200/90 hover:border-slate-300 focus:border-brand focus:ring-brand/20",
          "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
          className,
        )}
        {...rest}
      />
      {error && (
        <p id={descId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
      {!error && warning && (
        <p id={descId} className="text-xs font-medium text-warning-dark">
          {warning}
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
