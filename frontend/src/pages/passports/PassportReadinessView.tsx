import type { PassportReadiness } from "@/api/ai";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";

const DECISION: Record<PassportReadiness["decision"], { variant: BadgeVariant; vi: string; en: string }> = {
  ISSUED: { variant: "success", vi: "Đủ điều kiện cấp chính thức", en: "Eligible for official issue" },
  PROVISIONAL: { variant: "warning", vi: "Chỉ cấp tạm (chưa thẩm định)", en: "Provisional only (not verified)" },
  NOT_ISSUED: { variant: "danger", vi: "Chưa đủ điều kiện cấp", en: "Not eligible yet" },
};

const SOURCE = {
  AI: { vi: "Nhận xét do AI viết, quyết định do quy tắc", en: "Assessment written by AI, decision by rules" },
  RULES: { vi: "Theo quy tắc (AI chưa bật)", en: "Rule-based (AI off)" },
  DEMO: { vi: "Dữ liệu mẫu", en: "Sample data" },
} as const;

/** Kết quả xét điều kiện cấp hộ chiếu: quyết định, điểm so với ngưỡng, từng điều kiện và việc cần làm để cải thiện. */
export function PassportReadinessView({ result, lang }: { result: PassportReadiness; lang: "vi" | "en" }) {
  const d = DECISION[result.decision];
  const failed = result.checks.filter((c) => c.status === "FAILED");

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={d.variant}>{d[lang]}</Badge>
        <span className="tabular-nums text-slate-600">
          {lang === "en" ? "Score" : "Điểm"} <b className="text-slate-900">{result.score}</b>/100 ({lang === "en" ? "min" : "ngưỡng"} {result.min_score})
        </span>
      </div>

      <p className="rounded-md border border-slate-200 bg-slate-50 p-2.5 italic text-slate-700">&ldquo;{result.overall_assessment}&rdquo;</p>
      <p className="text-[11px] text-slate-400">{SOURCE[result.source][lang]}</p>

      {failed.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-semibold text-slate-800">
            {lang === "en" ? "To improve before issuing" : "Cần cải thiện trước khi cấp"} ({failed.length})
          </p>
          {failed.map((c) => (
            <div key={c.code} className="rounded-md border border-danger/30 bg-danger-light p-2">
              <div className="font-medium text-danger-dark">✗ {c.title}</div>
              <div className="mt-0.5 text-slate-700">{c.message}</div>
              <div className="mt-0.5 text-slate-600">
                → <b>{lang === "en" ? "Do:" : "Việc cần làm:"}</b> {c.action}
              </div>
            </div>
          ))}
        </div>
      )}

      {result.checks.some((c) => c.status === "PASSED") && (
        <details>
          <summary className="cursor-pointer text-slate-500">
            {lang === "en" ? "Passed checks" : "Điều kiện đã đạt"} ({result.checks.length - failed.length}/{result.checks.length})
          </summary>
          <ul className="mt-1 space-y-1">
            {result.checks
              .filter((c) => c.status === "PASSED")
              .map((c) => (
                <li key={c.code} className="rounded bg-white p-1.5 text-slate-600">
                  <span className="font-medium text-success">✓ {c.title}</span> · {c.message}
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  );
}
