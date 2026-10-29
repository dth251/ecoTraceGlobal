import { useState, useEffect } from "react";
import { Input, type InputProps } from "@/components/ui/Input";
import { formatNumber, parseLocaleNumber } from "@/lib/format";

export interface NumberInputProps extends Omit<InputProps, "value" | "onChange" | "type"> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  lang?: string;
  digits?: number;
}

/**
 * Ô nhập số định dạng Việt Nam (120.000,5), chấp nhận cả dấu chấm và phẩy.
 */
export function NumberInput({ value, onChange, lang = "vi", digits = 2, ...rest }: NumberInputProps) {
  const [text, setText] = useState<string>(() =>
    value !== null && value !== undefined && Number.isFinite(value) ? formatNumber(value, lang, digits) : "",
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(
        value !== null && value !== undefined && Number.isFinite(value)
          ? formatNumber(value, lang, digits)
          : "",
      );
    }
  }, [value, lang, digits, focused]);

  return (
    <Input
      {...rest}
      inputMode="decimal"
      value={text}
      onFocus={(e) => {
        setFocused(true);
        rest.onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        onChange(parseLocaleNumber(raw));
      }}
      onBlur={(e) => {
        setFocused(false);
        const parsed = parseLocaleNumber(text);
        onChange(parsed);
        if (parsed !== null) {
          setText(formatNumber(parsed, lang, digits));
        }
        rest.onBlur?.(e);
      }}
    />
  );
}
