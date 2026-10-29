import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { aiApi, type EstimateDocument, type EstimateResponse, type ExtractionResponse } from "@/api/ai";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { acceptFiles, formatEmission, MAX_FILES, MAX_FILE_MB, reviewFieldLabel, runWithConcurrency } from "./batch";
import { SuggestionCard } from "./SuggestionCard";

type DocStatus = "queued" | "processing" | "done" | "error";

interface BatchDoc {
  id: string;
  file: File;
  status: DocStatus;
  result?: ExtractionResponse;
  error?: string;
}

const STATUS_BADGE: Record<DocStatus, { variant: BadgeVariant; label: string }> = {
  queued: { variant: "neutral", label: "Chờ xử lý" },
  processing: { variant: "info", label: "AI đang đọc…" },
  done: { variant: "success", label: "Đã bóc tách" },
  error: { variant: "danger", label: "Lỗi" },
};

const SCOPES = [
  { key: "1", label: "Scope 1 · Nhiên liệu đốt trực tiếp", bar: "bg-scope1" },
  { key: "2", label: "Scope 2 · Điện mua vào", bar: "bg-scope2" },
  { key: "3", label: "Scope 3 · Nguyên liệu, vận chuyển", bar: "bg-scope3" },
] as const;

const fmt = (n: number, digits = 0) => n.toLocaleString("vi-VN", { maximumFractionDigits: digits });

export function BatchExtractPanel() {
  const [docs, setDocs] = useState<BatchDoc[]>([]);
  const [running, setRunning] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const counter = useRef(0);

  const patch = (id: string, change: Partial<BatchDoc>) =>
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...change } : d)));

  const addFiles = (incoming: File[]) => {
    const { accepted, rejected } = acceptFiles(incoming, docs.map((d) => d.file));
    setNotices(rejected);
    if (accepted.length === 0) return;
    setDocs((prev) => [...prev, ...accepted.map((file) => ({ id: `doc-${counter.current++}`, file, status: "queued" as DocStatus }))]);
    setEstimate(null);
    setEstimateError(null);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = ""; // cho phép chọn lại cùng một file sau khi xóa
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!running) addFiles(Array.from(e.dataTransfer.files));
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setEstimate(null);
  };

  const clearAll = () => {
    setDocs([]);
    setEstimate(null);
    setEstimateError(null);
    setNotices([]);
  };

  const handleRun = async () => {
    const snapshot = docs;
    const todo = snapshot.filter((d) => d.status !== "done");
    setRunning(true);
    setEstimate(null);
    setEstimateError(null);
    setDocs((prev) => prev.map((d) => (d.status === "done" ? d : { ...d, status: "queued", error: undefined })));

    // Tối đa 2 chứng từ song song để không vượt giới hạn của Gemini
    const outcomes = await runWithConcurrency(todo, 2, async (doc) => {
      patch(doc.id, { status: "processing" });
      try {
        const result = await aiApi.extractInvoice(doc.file);
        patch(doc.id, { status: "done", result });
        return { id: doc.id, result };
      } catch (err: unknown) {
        patch(doc.id, { status: "error", error: err instanceof Error ? err.message : "Lỗi gọi AI trích xuất" });
        return { id: doc.id, result: undefined };
      }
    });

    const resultById = new Map<string, ExtractionResponse>();
    snapshot.forEach((d) => d.status === "done" && d.result && resultById.set(d.id, d.result));
    outcomes.forEach((o) => o.result && resultById.set(o.id, o.result));

    const items = snapshot.flatMap((d) => {
      const data = resultById.get(d.id)?.data;
      return data ? [{ name: d.id, data }] : [];
    });
    if (resultById.size > 0 && items.length === 0) {
      setEstimateError("Dịch vụ chưa trả dữ liệu chi tiết của chứng từ nên chưa tổng hợp được CO₂e (chỉ có khi gọi trực tiếp AI service).");
    } else if (items.length > 0) {
      try {
        setEstimate(await aiApi.estimate(items));
      } catch (err: unknown) {
        setEstimateError(err instanceof Error ? `Không tổng hợp được CO₂e: ${err.message}` : "Không tổng hợp được CO₂e");
      }
    }
    setRunning(false);
  };

  const estimateById = new Map<string, EstimateDocument>((estimate?.documents ?? []).map((d) => [d.name, d]));
  const doneCount = docs.filter((d) => d.status === "done").length;
  const errorCount = docs.filter((d) => d.status === "error").length;
  const needReview = docs.filter((d) => d.status === "done" && (d.result?.overall_confidence ?? 1) <= 0.8).length;
  const total = estimate?.total_co2e_kg ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">Tải lên các chứng từ cần AI phân tích</h2>
          <p className="text-xs text-slate-500">
            Chọn <b>nhiều chứng từ cùng lúc</b> (điện, nhiên liệu, nguyên liệu, vận chuyển...). AI đọc từng tờ, tự gắn Scope 1/2/3, rồi
            tổng hợp phát thải của cả lô. Thiếu loại nào thì Scope đó bằng 0, vẫn tính được.
          </p>

          <div
            className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center hover:bg-slate-50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={onPick}
              disabled={running}
              className="hidden"
              id="ai-invoice-upload"
            />
            <label htmlFor="ai-invoice-upload" className="cursor-pointer space-y-1.5 block">
              <div className="text-3xl">📥</div>
              <div className="text-sm font-medium text-slate-700">Nhấp để chọn hoặc kéo thả nhiều chứng từ vào đây</div>
              <div className="text-xs text-slate-400">
                PDF, PNG, JPG · tối đa {MAX_FILES} chứng từ, mỗi file {MAX_FILE_MB}MB
              </div>
            </label>
          </div>

          {notices.length > 0 && (
            <div className="p-2.5 bg-warning-light text-warning-dark rounded-md text-xs space-y-0.5">
              {notices.map((n) => (
                <div key={n}>{n}</div>
              ))}
            </div>
          )}

          {docs.length > 0 && (
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-md max-h-56 overflow-y-auto">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs">
                  <span className="truncate text-slate-700" title={d.file.name}>
                    {d.file.name}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATUS_BADGE[d.status].variant}>{STATUS_BADGE[d.status].label}</Badge>
                    {!running && (
                      <button
                        type="button"
                        onClick={() => removeDoc(d.id)}
                        className="text-slate-400 hover:text-danger"
                        aria-label={`Bỏ ${d.file.name}`}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Button onClick={handleRun} loading={running} disabled={docs.length === 0} className="flex-1">
              {running ? "AI đang xử lý…" : `Bắt đầu bóc tách bằng AI${docs.length ? ` (${docs.length} chứng từ)` : ""}`}
            </Button>
            {docs.length > 0 && !running && (
              <Button variant="secondary" onClick={clearAll}>
                Xóa hết
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">Tổng hợp phát thải của cả lô</h2>
          {!estimate ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 text-sm border border-slate-100 rounded-md px-4">
              <span>{running ? "AI đang đọc chứng từ…" : "Chưa có dữ liệu tổng hợp"}</span>
              <span className="text-xs mt-1">
                {running ? "Mỗi chứng từ mất khoảng 7 giây" : "Chọn các chứng từ và bấm \"Bắt đầu bóc tách\""}
              </span>
              {estimateError && <span className="text-xs mt-3 text-danger-dark">{estimateError}</span>}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="bg-slate-50 rounded-md p-3 flex items-end justify-between">
                <div>
                  <div className="text-xs text-slate-500">Tổng phát thải ước tính</div>
                  <div className="text-2xl font-bold text-slate-900">{formatEmission(total)}</div>
                  {total >= 1000 && <div className="text-xs text-slate-400">{fmt(total)} kgCO₂e</div>}
                </div>
                <div className="text-right text-xs text-slate-500 space-y-0.5">
                  <div>
                    {estimate.calculated}/{docs.length} chứng từ đã tính
                  </div>
                  {needReview > 0 && <div className="text-warning-dark">{needReview} chứng từ cần xem lại</div>}
                  {errorCount > 0 && <div className="text-danger-dark">{errorCount} chứng từ lỗi</div>}
                </div>
              </div>

              <div className="space-y-2">
                {SCOPES.map((s) => {
                  const value = estimate.by_scope[s.key] ?? 0;
                  const pct = total > 0 ? (value / total) * 100 : 0;
                  return (
                    <div key={s.key}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-slate-700">{s.label}</span>
                        <span className="font-medium tabular-nums">
                          {fmt(value)} kg · {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded bg-slate-100 overflow-hidden">
                        <div className={`h-full ${s.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {Object.keys(estimate.by_factor).length > 0 && (
                <div className="text-xs text-slate-500">
                  Theo nguồn:{" "}
                  {Object.entries(estimate.by_factor).map(([code, kg], i) => (
                    <span key={code}>
                      {i > 0 && " · "}
                      <span className="font-mono">{code}</span> {fmt(kg)} kg
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">{estimate.disclaimer}</p>
            </div>
          )}
          {estimate && estimateError && <div className="text-xs text-danger-dark">{estimateError}</div>}
        </Card>
      </div>

      {doneCount + errorCount > 0 && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">Chi tiết từng chứng từ</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {docs
              .filter((d) => d.status === "done" || d.status === "error")
              .map((d) => (
                <DocResultCard key={d.id} doc={d} estimate={estimateById.get(d.id)} />
              ))}
          </div>
        </div>
      )}

      {estimate && estimate.optimization.suggestions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-800">Gợi ý giảm phát thải từ tổng hợp trên</h2>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
            <span className="font-bold text-slate-800">Tóm tắt:</span> {estimate.optimization.summary}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {estimate.optimization.suggestions.map((item) => (
              <SuggestionCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocResultCard({ doc, estimate }: { doc: BatchDoc; estimate?: EstimateDocument }) {
  if (doc.status === "error" || !doc.result) {
    return (
      <Card className="p-4 space-y-2">
        <div className="font-medium text-sm text-slate-800 truncate">{doc.file.name}</div>
        <div className="p-2.5 bg-danger-light text-danger-dark rounded-md text-xs">{doc.error ?? "Không đọc được chứng từ"}</div>
      </Card>
    );
  }
  const r = doc.result;
  const reviewFields = r.data?.review_fields ?? [];
  const lowConfidence = (r.overall_confidence ?? 1) <= 0.8;
  const scope = r.data?.scope ?? estimate?.scope;

  return (
    <Card className="p-4 space-y-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-slate-400 truncate" title={doc.file.name}>
            {doc.file.name}
          </div>
          <div className="font-semibold text-slate-800">{r.supplier_name || "N/A"}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant={lowConfidence ? "warning" : "success"}>
            Tin cậy: {(((r.overall_confidence ?? 0) as number) * 100).toFixed(0)}%
          </Badge>
          {scope ? <Badge variant="info">Scope {scope}</Badge> : <Badge>Ngoài phạm vi</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 p-2 rounded">
          <span className="text-slate-500">Số hóa đơn:</span> <span className="font-mono font-medium">{r.invoice_no || "N/A"}</span>
        </div>
        <div className="bg-slate-50 p-2 rounded">
          <span className="text-slate-500">Ngày lập:</span> <span className="font-mono font-medium">{r.invoice_date || "N/A"}</span>
        </div>
        <div className="bg-slate-50 p-2 rounded">
          <span className="text-slate-500">Tổng tiền:</span>{" "}
          <span className="font-semibold text-slate-800">
            {r.total_amount?.toLocaleString("vi-VN") ?? 0} {r.currency}
          </span>
        </div>
        <div className="bg-slate-50 p-2 rounded">
          <span className="text-slate-500">Loại:</span> <span className="font-medium text-brand">{r.doc_type}</span>
        </div>
      </div>

      {r.lines?.map((line, idx) => (
        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded border border-slate-100">
          <div className="pr-2">
            <p className="font-medium text-slate-800">{line.description}</p>
            <p className="text-[10px] text-slate-400 font-mono">Mã hệ số: {line.factor_code}</p>
          </div>
          <div className="text-right whitespace-nowrap">
            <span className="font-semibold text-slate-700">{line.quantity?.toLocaleString("vi-VN")}</span> {line.unit}
          </div>
        </div>
      ))}

      {reviewFields.length > 0 && (
        <div className="p-2 bg-warning-light text-warning-dark rounded text-xs">
          Cần xác nhận: {reviewFields.map(reviewFieldLabel).join(", ")}
        </div>
      )}

      {estimate && (
        <div className="border-t border-slate-100 pt-2 text-xs space-y-0.5">
          {estimate.status === "CALCULATED" && estimate.co2e_kg !== null ? (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">Phát thải ước tính</span>
                <span className="font-bold text-slate-900">{formatEmission(estimate.co2e_kg)}</span>
              </div>
              {estimate.formula && <div className="font-mono text-[11px] text-slate-400">{estimate.formula}</div>}
              {estimate.note && <div className="text-[11px] text-slate-400">{estimate.note}</div>}
            </>
          ) : (
            <div className="text-slate-500">
              Chưa tính được CO₂e: {estimate.status === "MISSING_DATA" ? "thiếu số liệu" : estimate.status === "UNIT_MISMATCH" ? "đơn vị chưa khớp hệ số" : "chưa xác định được hệ số"}
              {estimate.note ? ` (${estimate.note})` : ""}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
