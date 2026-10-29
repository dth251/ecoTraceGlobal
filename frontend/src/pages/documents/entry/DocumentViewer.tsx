import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/Button";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export interface DocumentViewerProps {
  fileUrl?: string | null;
  contentType?: string | null;
  fileName?: string;
}

export function DocumentViewer({ fileUrl, contentType, fileName }: DocumentViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);

  const isPdf = contentType?.includes("pdf") || fileName?.toLowerCase().endsWith(".pdf");

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 text-xs">
        <span className="truncate font-medium text-slate-700">{fileName ?? "Document"}</span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}>
            −
          </Button>
          <span className="px-1 tabular-nums">{Math.round(scale * 100)}%</span>
          <Button size="sm" variant="ghost" onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}>
            +
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRotation((r) => (r + 90) % 360)}>
            ↻
          </Button>
          {isPdf && numPages > 1 && (
            <div className="ml-2 flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              >
                ‹
              </Button>
              <span className="tabular-nums text-slate-500">
                {pageNumber}/{numPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              >
                ›
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {!fileUrl ? (
          <p className="text-xs text-slate-500">Xem trước chứng từ gốc</p>
        ) : isPdf ? (
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages: total }) => setNumPages(total)}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        ) : (
          <img
            src={fileUrl}
            alt={fileName ?? "Document preview"}
            style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
            className="max-h-full max-w-full object-contain transition-transform"
          />
        )}
      </div>
    </div>
  );
}
