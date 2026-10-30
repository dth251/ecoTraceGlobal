import { useTranslation } from "react-i18next";
import { Tooltip } from "@/components/ui/Tooltip";
import { formatNumber } from "@/lib/format";
import { SCOPE_COLORS } from "@/lib/scopeColors";
import type { ProductFootprint } from "@/types/domain";

/**
 * Phát thải trên mỗi đơn vị sản phẩm (kgCO₂e/đơn vị), thanh ngang chồng theo nguồn gốc:
 * trực tiếp (Scope 1), năng lượng mua (Scope 2), tiền chất (Scope 3). Tổng ghi trực tiếp; khe 2px giữa các đoạn.
 */
export function ProductIntensityChart({ footprints }: { footprints: ProductFootprint[] }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const kg = (v: number) => `${formatNumber(v, lang, 2)} kgCO₂e`;
  const max = Math.max(...footprints.map((f) => Number(f.totalPerUnit)), 0);
  if (max <= 0) return null;

  return (
    <ol className="space-y-5">
      {footprints.map((f) => {
        const parts = [
          { key: "direct", label: t("dashboard.parts.direct"), value: Number(f.directPerUnit), color: SCOPE_COLORS.scope1 },
          { key: "indirect", label: t("dashboard.parts.indirect"), value: Number(f.indirectPerUnit), color: SCOPE_COLORS.scope2 },
          { key: "precursor", label: t("dashboard.parts.precursor"), value: Number(f.precursorPerUnit), color: SCOPE_COLORS.scope3 },
        ].filter((p) => p.value > 0);
        const total = Number(f.totalPerUnit);
        return (
          <li key={f.productId}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink">{f.productName}</span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">
                {formatNumber(total, lang, 1)} kg / {t("dashboard.unit")}
              </span>
            </div>
            <div className="mt-1.5 flex h-3 gap-[2px]" style={{ width: `${(total / max) * 100}%` }}>
              {parts.map((p) => (
                <Tooltip key={p.key} content={`${p.label}: ${kg(p.value)}`}>
                  <div
                    className="h-full first:rounded-l-[4px] last:rounded-r-[4px]"
                    style={{ width: `${(p.value / total) * 100}%`, background: p.color, minWidth: 3 }}
                  />
                </Tooltip>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
