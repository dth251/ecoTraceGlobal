import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatEmission, reviewFieldLabel } from "@/pages/ai/batch";
import { useAiBatchStore } from "@/stores/aiBatchStore";

/** Chi tiết các chứng từ AI đã bóc tách ở lô gần nhất (khung tải chứng từ ở đầu trang Chứng từ). */
export function AiProcessedDocuments() {
  const batch = useAiBatchStore((s) => s.batch);
  if (!batch) return null;

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Chứng từ AI đã bóc tách (lô gần nhất)</h2>
          <p className="text-xs text-slate-500">
            {batch.records.length} chứng từ · xử lý lúc {new Date(batch.processedAt).toLocaleString("vi-VN")}. Dữ liệu lưu trên trình duyệt này, chưa ghi vào
            database.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Tệp</th>
              <th className="px-3 py-2">Nhà cung cấp</th>
              <th className="px-3 py-2">Số HĐ · Ngày</th>
              <th className="px-3 py-2">Scope</th>
              <th className="px-3 py-2 text-right">Phát thải</th>
              <th className="px-3 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batch.records.map((r) => {
              const e = r.estimate;
              const review = (e?.needs_review ?? false) || (r.extraction.overall_confidence ?? 1) <= 0.8;
              return (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    <details>
                      <summary className="cursor-pointer">{r.fileName}</summary>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        {r.extraction.lines?.map((l, i) => (
                          <div key={i}>
                            {l.description}: <b>{l.quantity?.toLocaleString("vi-VN")}</b> {l.unit}{" "}
                            <span className="font-mono text-slate-400">({l.factor_code})</span>
                          </div>
                        ))}
                        {(e?.review_fields?.length ?? 0) > 0 && (
                          <div className="rounded bg-warning-light p-1.5 text-warning-dark">
                            Cần xác nhận: {e?.review_fields.map(reviewFieldLabel).join(", ")}
                          </div>
                        )}
                        {e?.formula && <div className="font-mono text-[11px] text-slate-400">{e.formula}</div>}
                        {e?.note && <div className="text-slate-400">{e.note}</div>}
                      </div>
                    </details>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.extraction.supplier_name || "N/A"}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.extraction.invoice_no || "N/A"} · {r.extraction.invoice_date || "N/A"}
                  </td>
                  <td className="px-3 py-2">{e?.scope ? <Badge variant="info">Scope {e.scope}</Badge> : <Badge>Ngoài phạm vi</Badge>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {e?.status === "CALCULATED" && e.co2e_kg != null ? formatEmission(e.co2e_kg) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={review ? "warning" : "success"}>{review ? "Cần xem lại" : "Đã bóc tách"}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
