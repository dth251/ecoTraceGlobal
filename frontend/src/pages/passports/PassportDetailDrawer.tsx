import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import type { Passport } from "@/types/domain";

export interface PassportDetailDrawerProps {
  passport: Passport | null;
  onClose: () => void;
  onRevoke?: (id: string) => void;
}

export function PassportDetailDrawer({ passport, onClose, onRevoke }: PassportDetailDrawerProps) {
  const { t, i18n } = useTranslation();
  const isVi = !i18n.language.startsWith("en");
  const [copied, setCopied] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const verifyUrl = passport
    ? `${window.location.origin}/verify/${passport.publicCode}`
    : "";

  const handleCopyLink = async () => {
    if (!verifyUrl) return;
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownloadQr = () => {
    if (!passport || !canvasWrapRef.current) return;
    const canvas = canvasWrapRef.current.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `EcoTrace-QR-${passport.publicCode}.png`;
    a.click();
  };

  return (
    <Drawer
      open={!!passport}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={passport?.publicCode ?? ""}
      description={passport?.productName}
    >
      {passport && (
        <div className="space-y-4 text-xs">
          {/* Khung hiển thị Mã QR xác thực công khai */}
          <div className="flex flex-col items-center rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/70 to-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{isVi ? "Mã QR Hộ chiếu Xanh (CBAM)" : "Green Passport QR Code (CBAM)"}</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <QRCodeSVG
                value={verifyUrl}
                size={168}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Canvas ẩn độ phân giải cao để tải ảnh PNG */}
            <div ref={canvasWrapRef} className="hidden">
              <QRCodeCanvas
                value={verifyUrl}
                size={512}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="mt-2 font-mono text-xs font-bold tracking-wider text-slate-900">
              {passport.publicCode}
            </p>
            <p className="mt-0.5 text-center text-[11px] text-slate-500">
              {isVi
                ? "Quét mã QR để tra cứu chứng nhận phát thải & chữ ký số ECDSA P-256"
                : "Scan QR code to verify embedded emissions & ECDSA P-256 signature"}
            </p>

            <div className="mt-3 flex w-full flex-wrap items-center justify-center gap-2">
              <Button size="sm" variant="primary" onClick={handleDownloadQr}>
                {isVi ? "Tải mã QR (PNG)" : "Download QR (PNG)"}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCopyLink}>
                {copied
                  ? isVi
                    ? "Đã sao chép!"
                    : "Copied!"
                  : isVi
                    ? "Sao chép link"
                    : "Copy link"}
              </Button>
              <a
                href={verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {isVi ? "Mở trang xác thực ↗" : "Open verify page ↗"}
              </a>
            </div>
          </div>

          {/* Thông tin chi tiết hộ chiếu */}
          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{isVi ? "Trạng thái" : "Status"}</span>
              <Badge variant={passport.status === "VALID" ? "success" : "danger"}>
                {passport.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{isVi ? "Sản phẩm" : "Product"}</span>
              <span className="font-medium text-slate-900">{passport.productName}</span>
            </div>
            {passport.periodName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{isVi ? "Kỳ báo cáo" : "Period"}</span>
                <span className="font-medium text-slate-900">{passport.periodName}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                {isVi ? "Phát thải nhúng / đơn vị" : "Emissions / unit"}
              </span>
              <Co2eValue kg={passport.totalPerUnit} />
            </div>
            <div className="border-t border-slate-200/80 pt-2">
              <p className="text-slate-500">{isVi ? "Liên kết xác thực" : "Verification URL"}</p>
              <a
                href={verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 block break-all font-mono text-[11px] text-emerald-700 underline hover:text-emerald-800"
              >
                {verifyUrl}
              </a>
            </div>
            <div className="border-t border-slate-200/80 pt-2">
              <p className="text-slate-500">SHA-256 Hash</p>
              <p className="mt-0.5 break-all rounded bg-white p-1.5 font-mono text-[11px] text-slate-700 border border-slate-200/70">
                {passport.hash}
              </p>
            </div>
          </div>

          {onRevoke && passport.status === "VALID" && (
            <div className="pt-2">
              <Button variant="danger" size="sm" onClick={() => onRevoke(passport.id)}>
                {t("passports.revoke")}
              </Button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
