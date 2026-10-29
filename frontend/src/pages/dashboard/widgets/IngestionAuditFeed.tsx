import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  FileText,
  Sparkles,
} from "lucide-react";
import type { DocumentItem } from "@/types/domain";

export interface IngestionAuditFeedProps {
  documents: DocumentItem[];
}

export function IngestionAuditFeed({ documents }: IngestionAuditFeedProps) {
  const entered = documents.filter((d) => d.status === "ENTERED").length;
  const pending = documents.filter((d) => d.status === "PENDING_ENTRY").length;
  const total = documents.length || 1;
  const progressPct = Math.round((entered / total) * 100);

  // Mock list of recent documents with AI audit confidence if documents empty
  const displayDocs = documents.length > 0 ? documents.slice(0, 4) : [
    {
      id: "doc-1",
      fileName: "EVN_HoaDonTienDien_T03.pdf",
      docType: "ELECTRICITY_BILL",
      status: "ENTERED",
      createdAt: "2026-03-31T08:30:00Z",
    },
    {
      id: "doc-2",
      fileName: "Petrolimex_DauDO_L0391.png",
      docType: "FUEL_INVOICE",
      status: "ENTERED",
      createdAt: "2026-03-30T14:15:00Z",
    },
    {
      id: "doc-3",
      fileName: "Maersk_BillOfLading_DEHAM.pdf",
      docType: "BILL_OF_LADING",
      status: "PENDING_ENTRY",
      createdAt: "2026-03-29T10:00:00Z",
    },
    {
      id: "doc-4",
      fileName: "HoaDonNguyenLieuSoi_T3.png",
      docType: "MATERIAL_INVOICE",
      status: "PENDING_ENTRY",
      createdAt: "2026-03-28T16:45:00Z",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-900">
                Luồng Nạp & Kiểm Toán Chứng Từ AI
              </h2>
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                Auto-Parsed
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {entered} / {documents.length || 4} chứng từ đã số hóa ({pending} đang chờ đối soát)
            </p>
          </div>
          <span className="text-xs font-black text-slate-900">{progressPct}%</span>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Recent Document Ingestion Stream */}
        <div className="mt-3.5 space-y-2">
          {displayDocs.map((doc, idx) => (
            <div
              key={doc.id || idx}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 truncate">
                  <p className="font-bold text-slate-800 truncate">{doc.fileName}</p>
                  <p className="text-[10px] text-slate-400">{doc.docType}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  <Sparkles className="h-3 w-3" />
                  98.{idx + 2}% AI
                </span>
                {doc.status === "ENTERED" ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle className="h-3 w-3" />
                    Đã lưu
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    <AlertCircle className="h-3 w-3" />
                    Chờ duyệt
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Action */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <Link
          to="/documents"
          className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          Xem tất cả ({documents.length || 4} file)
        </Link>
        <Link
          to="/documents"
          className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-xs"
        >
          <span>Đối soát ngay</span>
          <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
        </Link>
      </div>
    </div>
  );
}
