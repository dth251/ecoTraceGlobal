import { useTranslation } from "react-i18next";
import clsx from "clsx";
import type { Scope } from "@/types/domain";

export interface ScopeTagProps {
  scope: Scope;
}

const SCOPE_STYLES: Record<Scope, string> = {
  1: "bg-scope1-light text-scope1-dark",
  2: "bg-scope2-light text-scope2-dark",
  3: "bg-scope3-light text-scope3-dark",
};

export function ScopeTag({ scope }: ScopeTagProps) {
  const { t } = useTranslation();
  const label = scope === 1 ? t("common.scope1") : scope === 2 ? t("common.scope2") : t("common.scope3");

  return (
    <span className={clsx("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", SCOPE_STYLES[scope])}>
      {label}
    </span>
  );
}
