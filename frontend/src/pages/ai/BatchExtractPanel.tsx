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
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Bóc tách chứng từ bằng AI</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động nhận diện hoá đơn điện, nhiên liệu, vật tư và vận chuyển để trích xuất phát thải.
          </p>
        </div>
        {canSave && period && (
          <Badge variant="neutral">Kỳ đích: {period.name}</Badge>
        )}
      </div>

      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-brand/40 hover:bg-slate-50/60 transition-all cursor-pointer group"
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
        <label htmlFor="ai-invoice-upload" className="cursor-pointer block space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand group-hover:scale-105 transition-transform">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-slate-700">
            Kéo thả chứng từ vào đây, hoặc <span className="text-brand underline underline-offset-2">chọn tệp</span>
          </div>
          <p className="text-xs text-slate-400">
            Hỗ trợ PDF, PNG, JPG · Tối đa {MAX_FILES} tệp, tối đa {MAX_FILE_MB}MB mỗi tệp
          </p>
        </label>
      </div>

      {notices.length > 0 && (
        <div className="p-3 bg-warning-light text-warning-dark rounded-lg text-xs space-y-1">
          {notices.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg max-h-60 overflow-y-auto">
          {docs.map((d) => (
            <li key={d.id} className="px-3 py-2 text-xs hover:bg-slate-50/50">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-slate-700 font-medium" title={d.file.name}>
                  {d.file.name}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  {d.saved === "saved" && <Badge variant="info">Đã lưu nháp</Badge>}
                  {d.saved === "manual" && <Badge variant="warning">Cần nhập tay</Badge>}
                  {d.saved === "duplicate" && <Badge variant="neutral">Đã tồn tại</Badge>}
                  {d.saved === "failed" && <Badge variant="warning">Chưa lưu</Badge>}
                  <Badge variant={STATUS_BADGE[d.status].variant}>{STATUS_BADGE[d.status].label}</Badge>
                  {!running && (
                    <button
                      type="button"
                      onClick={() => removeDoc(d.id)}
                      className="text-slate-400 hover:text-danger p-0.5 rounded"
                      aria-label={`Bỏ ${d.file.name}`}
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
              {d.error && <div className="mt-1 text-danger-dark">{d.error}</div>}
            </li>
          ))}
        </ul>
      )}

      {finished && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3.5 text-xs text-emerald-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-bold">Đã bóc tách thành công {finished.ok} chứng từ</span>
            {finished.failed > 0 && `, ${finished.failed} chứng từ lỗi`}
            {finished.review > 0 && `, ${finished.review} chứng từ cần rà soát lại`}.
            <div className="text-slate-500 mt-0.5">Dữ liệu đã tạo bản nháp trong danh sách chứng từ bên dưới.</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 transition-colors"
            >
              Xem tổng quan phát thải →
            </Link>
          </div>
        </div>
      )}

      {error && <div className="p-3 bg-danger-light text-danger-dark rounded-lg text-xs">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs text-slate-400">
          {canSave
            ? `Chứng từ sau bóc tách sẽ lưu dưới dạng bản nháp để bạn duyệt trước khi tính phát thải.`
            : isLocked
              ? "Kỳ đã khóa: chỉ đọc và ước tính thử, không lưu vào hệ thống."
              : "Vui lòng chọn kỳ báo cáo ở trên để lưu chứng từ."}
        </p>

        <div className="flex items-center gap-2">
          {docs.length > 0 && !running && (
            <Button variant="secondary" size="sm" onClick={clearAll}>
              Xóa danh sách
            </Button>
          )}
          <Button onClick={handleRun} loading={running} disabled={docs.length === 0} size="sm">
            {running ? "AI đang xử lý…" : `Bắt đầu bóc tách${docs.length ? ` (${docs.length})` : ""}`}
          </Button>
        </div>
      </div>
    </Card>
  );
}
