import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { aiApi, type ExtractionResponse } from "@/api/ai";
import { ApiError } from "@/api/client";
import { documentsApi } from "@/api/documents";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { keys } from "@/queries/keys";
import { useAiBatchStore } from "@/stores/aiBatchStore";
import type { DocType } from "@/types/domain";
import { acceptFiles, MAX_FILES, MAX_FILE_MB, runWithConcurrency } from "./batch";

type DocStatus = "queued" | "processing" | "done" | "error";

interface BatchDoc {
  id: string;
  file: File;
  status: DocStatus;
  error?: string;
  /** Đã lưu vào kỳ đang chọn: "saved" là bản nháp AI chờ xác nhận, "manual" là AI không đọc được nên lưu tệp để nhập tay */
  saved?: "saved" | "manual" | "duplicate" | "failed";
}

const STATUS_BADGE: Record<DocStatus, { variant: BadgeVariant; label: string }> = {
  queued: { variant: "neutral", label: "Chờ xử lý" },
  processing: { variant: "info", label: "AI đang đọc…" },
  done: { variant: "success", label: "Đã bóc tách" },
  error: { variant: "danger", label: "Lỗi" },
};

/** Nơi kết quả của AI xuất hiện sau khi xử lý. Chi tiết từng chứng từ nằm ngay trong danh sách bên dưới của trang Chứng từ. */
const DESTINATIONS = [
  { to: "/dashboard", title: "Tổng quan", desc: "Tổng phát thải theo Scope 1/2/3, theo tháng và theo nguồn" },
  { to: "/reports", title: "Báo cáo", desc: "Tải bảng tổng hợp của cả lô" },
  { to: "/optimizer", title: "Tối ưu", desc: "Gợi ý giảm phát thải từ số liệu vừa tổng hợp" },
] as const;

export function BatchExtractPanel() {
  const [docs, setDocs] = useState<BatchDoc[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState<{ ok: number; failed: number; review: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const counter = useRef(0);
  const results = useRef(new Map<string, ExtractionResponse>());
  const saveBatch = useAiBatchStore((s) => s.setBatch);
  const queryClient = useQueryClient();
  const { periodId, period, isLocked } = useCurrentContext();
  const canSave = !!periodId && !isLocked;

  /** Lưu file và bản nháp AI vào kỳ: số liệu chưa tính cho tới khi người dùng xác nhận ở mục Chứng từ. */
  const saveToPeriod = async (file: File, result: ExtractionResponse | null): Promise<BatchDoc["saved"]> => {
    if (!periodId) return undefined;
    try {
      const doc = await documentsApi.upload(periodId, (result?.doc_type as DocType) || null, file);
      if (!result) return "manual";
      await documentsApi.aiDraft(doc.id, result);
      return "saved";
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "DUPLICATE_DOCUMENT") return "duplicate";
      return "failed";
    }
  };

  const patch = (id: string, change: Partial<BatchDoc>) =>
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...change } : d)));

  const addFiles = (incoming: File[]) => {
    const { accepted, rejected } = acceptFiles(incoming, docs.map((d) => d.file));
    setNotices(rejected);
    if (accepted.length === 0) return;
    setDocs((prev) => [...prev, ...accepted.map((file) => ({ id: `doc-${counter.current++}`, file, status: "queued" as DocStatus }))]);
    setFinished(null);
    setError(null);
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
    results.current.delete(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setFinished(null);
  };

  const clearAll = () => {
    results.current.clear();
    setDocs([]);
    setFinished(null);
    setError(null);
    setNotices([]);
  };

  const handleRun = async () => {
    const snapshot = docs;
    const todo = snapshot.filter((d) => d.status !== "done");
    setRunning(true);
    setFinished(null);
    setError(null);
    setDocs((prev) => prev.map((d) => (d.status === "done" ? d : { ...d, status: "queued", error: undefined })));

    // Tối đa 2 chứng từ song song để không vượt giới hạn của Gemini
    await runWithConcurrency(todo, 2, async (doc) => {
      patch(doc.id, { status: "processing" });
      try {
        const result = await aiApi.extractInvoice(doc.file);
        results.current.set(doc.id, result);
        patch(doc.id, { status: "done", saved: canSave ? await saveToPeriod(doc.file, result) : undefined });
      } catch (err: unknown) {
        // AI không đọc được: vẫn lưu tệp vào kỳ để người dùng nhập tay ở mục Chứng từ
        patch(doc.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Lỗi gọi AI trích xuất",
          saved: canSave ? await saveToPeriod(doc.file, null) : undefined,
        });
      }
    });

    if (canSave) await queryClient.invalidateQueries({ queryKey: keys.documents(periodId) });
    const read = snapshot.filter((d) => results.current.has(d.id));
    const items = read.flatMap((d) => {
      const data = results.current.get(d.id)?.data;
      return data ? [{ name: d.id, data }] : [];
    });
    if (read.length > 0 && items.length === 0) {
      setError("Dịch vụ chưa trả dữ liệu chi tiết của chứng từ nên chưa tổng hợp được CO₂e (chỉ có khi gọi trực tiếp AI service).");
    } else if (items.length > 0) {
      try {
        const estimate = await aiApi.estimate(items);
        const byId = new Map(estimate.documents.map((d) => [d.name, d]));
        saveBatch(
          read.map((d) => ({ id: d.id, fileName: d.file.name, extraction: results.current.get(d.id)!, estimate: byId.get(d.id) })),
          estimate,
        );
        setFinished({
          ok: read.length,
          failed: snapshot.length - read.length,
          review: estimate.documents.filter((d) => d.needs_review).length,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? `Không tổng hợp được CO₂e: ${err.message}` : "Không tổng hợp được CO₂e");
      }
    }
    setRunning(false);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-4 space-y-3">
        <h2 className="text-base font-semibold text-slate-800">Tải chứng từ lên, AI đọc giúp bạn</h2>
        <p className="text-xs text-slate-500">
          Chọn <b>nhiều chứng từ cùng lúc</b> (điện, nhiên liệu, nguyên liệu, vận chuyển...). AI đọc từng tờ và tự gắn Scope 1/2/3. Thiếu loại nào thì
          Scope đó bằng 0, vẫn tính được. Tờ nào AI không đọc được vẫn được lưu để bạn nhập tay.
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
            <div className="text-sm font-medium text-slate-700">Nhấp để chọn hoặc kéo thả nhiều chứng từ vào đây</div>
            <span className="block text-xs text-slate-400 [text-wrap:pretty]">
              PDF, PNG, JPG · tối đa {MAX_FILES} chứng từ, mỗi file {MAX_FILE_MB}MB
            </span>
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
          <ul className="divide-y divide-slate-100 border border-slate-100 rounded-md max-h-64 overflow-y-auto">
            {docs.map((d) => (
              <li key={d.id} className="px-2.5 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-700" title={d.file.name}>
                    {d.file.name}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {d.saved === "saved" && <Badge variant="info">Đã lưu vào kỳ</Badge>}
                    {d.saved === "manual" && <Badge variant="warning">Đã lưu, cần nhập tay</Badge>}
                    {d.saved === "duplicate" && <Badge variant="neutral">Đã có trong hệ thống</Badge>}
                    {d.saved === "failed" && <Badge variant="warning">Chưa lưu vào kỳ</Badge>}
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
                </div>
                {d.error && <div className="mt-0.5 text-danger-dark">{d.error}</div>}
              </li>
            ))}
          </ul>
        )}

        <p className={`p-2.5 rounded-md text-xs ${canSave ? "bg-brand/5 text-slate-700" : "bg-warning-light text-warning-dark"}`}>
          {canSave
            ? `Chứng từ sẽ được lưu vào kỳ ${period?.name ?? ""} dưới dạng bản nháp AI. Bấm "Xác nhận" ở từng dòng trong danh sách bên dưới thì số liệu mới được tính vào kiểm kê và hộ chiếu xanh.`
            : isLocked
              ? "Kỳ đang chọn đã khóa: chứng từ chỉ được AI đọc và ước tính, không lưu vào kỳ."
              : "Chưa chọn kỳ báo cáo (ô trên cùng): chứng từ chỉ được AI đọc và ước tính, không lưu vào hệ thống."}
        </p>

        {error && <div className="p-2.5 bg-danger-light text-danger-dark rounded-md text-xs">{error}</div>}

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
        {finished ? (
          <>
            <div className="rounded-md bg-success-light p-3 text-sm text-success-dark">
              <b>Xong:</b> AI đã đọc {finished.ok} chứng từ
              {finished.failed > 0 && `, ${finished.failed} chứng từ lỗi`}
              {finished.review > 0 && `, ${finished.review} chứng từ cần bạn xem lại`}. Từng chứng từ nằm trong danh sách bên dưới, số liệu tổng hợp ở các mục sau.
            </div>
            <Link
              to="/dashboard"
              className="block rounded-md bg-brand px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-800"
            >
              Xem tổng quan phát thải →
            </Link>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-slate-800">Kết quả sẽ xuất hiện ở đâu?</h2>
            <p className="text-xs text-slate-500">
              {running ? "AI đang đọc chứng từ, mỗi chứng từ mất khoảng 7 giây. " : ""}
              Xử lý xong, từng chứng từ hiện trong danh sách bên dưới để bạn xác nhận. Số liệu tổng hợp nằm ở đúng mục của nó:
            </p>
          </>
        )}

        <ul className="space-y-2">
          {DESTINATIONS.map((d) => (
            <li key={d.to}>
              {finished ? (
                <Link
                  to={d.to}
                  className="block rounded-md border border-slate-200 p-2.5 transition-colors hover:border-brand/50 hover:bg-brand/5"
                >
                  <div className="text-sm font-semibold text-slate-800">{d.title} →</div>
                  <p className="text-xs text-slate-500">{d.desc}</p>
                </Link>
              ) : (
                <div className="rounded-md border border-slate-100 p-2.5">
                  <div className="text-sm font-semibold text-slate-700">{d.title}</div>
                  <p className="text-xs text-slate-400">{d.desc}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
