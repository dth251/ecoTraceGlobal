import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { formatCo2e } from "@/lib/format";

export interface Co2eValueProps {
  kg: number | null | undefined;
  className?: string;
}

/** Hiển thị số + đơn vị tCO2e / kgCO2e thống nhất trên toàn ứng dụng */
export function Co2eValue({ kg, className }: Co2eValueProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";

  if (kg === null || kg === undefined) {
    return <span className={clsx("tabular-nums text-slate-400", className)}>—</span>;
  }

  return <span className={clsx("tabular-nums", className)}>{formatCo2e(kg, lang)}</span>;
}
