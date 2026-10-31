import { forwardRef, useId, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id?: string;
  name?: string;
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  disabled?: boolean;
  className?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  onBlur?: (e: unknown) => void;
  onFocus?: (e: unknown) => void;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, placeholder, id, name, value, defaultValue, disabled, className, onChange },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const [internalVal, setInternalVal] = useState(defaultValue ? String(defaultValue) : "");

  const currentVal = value !== undefined ? String(value) : internalVal;
  const selectedOpt = options.find((o) => String(o.value) === currentVal);

  const handleSelect = (val: string) => {
    setInternalVal(val);
    if (onChange) {
      onChange({ target: { value: val, name } });
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={selectId} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}

      {/* Hidden native select for standard HTML form accessibility & test refs */}
      <select
        ref={ref}
        id={selectId}
        name={name}
        value={currentVal}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={disabled}
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Modern Custom Dropdown UI */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild disabled={disabled}>
          <button
            type="button"
            id={`${selectId}-trigger`}
            aria-invalid={!!error}
            disabled={disabled}
            className={clsx(
              "w-full rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm font-medium text-slate-800 transition-all shadow-xs flex items-center justify-between",
              "focus:outline-none focus:ring-2",
              error
                ? "border-danger focus:border-danger focus:ring-danger/20"
                : "border-slate-200/90 hover:border-slate-300 focus:border-brand focus:ring-brand/20",
              disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200",
              className,
            )}
          >
            <span className={clsx("truncate", !selectedOpt && "text-slate-400 font-normal")}>
              {selectedOpt ? selectedOpt.label : (placeholder || "Chọn một mục...")}
            </span>
            <svg
              className="h-4 w-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={5}
            className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95"
          >
            {placeholder && (
              <DropdownMenu.Item
                onSelect={() => handleSelect("")}
                className={clsx(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors outline-none",
                  currentVal === "" ? "bg-brand/10 text-brand font-semibold" : "text-slate-500 hover:bg-slate-50",
                )}
              >
                <span>{placeholder}</span>
                {currentVal === "" && (
                  <svg className="h-4 w-4 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </DropdownMenu.Item>
            )}

            {options.map((o) => {
              const active = String(o.value) === currentVal;
              return (
                <DropdownMenu.Item
                  key={o.value}
                  onSelect={() => handleSelect(String(o.value))}
                  className={clsx(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors outline-none",
                    active
                      ? "bg-brand/10 text-brand font-semibold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {active && (
                    <svg className="h-4 w-4 text-brand shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {error && <span className="text-xs text-danger font-medium">{error}</span>}
    </div>
  );
});
