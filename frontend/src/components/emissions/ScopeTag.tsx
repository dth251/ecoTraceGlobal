import { useTranslation } from "react-i18next";
import clsx from "clsx";
import type { Scope } from "@/types/domain";

export interface ScopeTagProps {
  scope: Scope;
  /** Chỉ hiện "Scope N" (dùng trong bảng hẹp); tên đầy đủ nằm trong tooltip */
  short?: boolean;
}

const SCOPE_STYLES: Record<Scope, string> = {
  1: "bg-scope1-light text-scope1-dark",
  2: "bg-scope2-light text-scope2-dark",
  3: "bg-scope3-light text-scope3-dark",
};

export function ScopeTag({ scope, short = false }: ScopeTagProps) {
  const { t } = useTranslation();
  const label = scope === 1 ? t("common.scope1") : scope === 2 ? t("common.scope2") : t("common.scope3");

  return (
    <span
      title={short ? label : undefined}
      className={clsx("inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium", SCOPE_STYLES[scope])}
    >
      {short ? `Scope ${scope}` : label}
    </span>
  );
}
