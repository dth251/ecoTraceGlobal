import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { passportsApi } from "@/api/passports";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { usePermission } from "@/hooks/usePermission";
import { IssuePassportDialog } from "@/pages/passports/IssuePassportDialog";
import { PassportDetailDrawer } from "@/pages/passports/PassportDetailDrawer";
import { keys } from "@/queries/keys";
import { usePassports } from "@/queries/usePassports";
import { useProducts } from "@/queries/useProducts";
import type { Passport } from "@/types/domain";

export function PassportsPage() {
  const { t, i18n } = useTranslation();
  const isVi = !i18n.language.startsWith("en");
  const queryClient = useQueryClient();
  const { periodId } = useCurrentContext();
  const { isOwner } = usePermission();
  const passports = usePassports(periodId);
  const products = useProducts();
  const [issueOpen, setIssueOpen] = useState(false);
  const [selected, setSelected] = useState<Passport | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t("passports.title")}</h1>
          <p className="text-xs text-slate-500">
            {isVi
              ? "Mỗi hộ chiếu xanh đi kèm mã QR và chữ ký số ECDSA P-256 để đối tác quốc tế tra cứu trực tiếp."
              : "Each green passport includes a scannable QR code and ECDSA P-256 signature for instant buyer verification."}
          </p>
        </div>
        {isOwner && periodId && (
          <Button size="sm" onClick={() => setIssueOpen(true)}>
            + {t("passports.issueNew")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(passports.data ?? []).map((p) => {
          const verifyUrl = `${window.location.origin}/verify/${p.publicCode}`;
          return (
            <Card
              key={p.id}
              className="flex flex-col justify-between gap-4 border border-slate-200/90 p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-4">
                {/* Mã QR hiển thị trực tiếp trên thẻ hộ chiếu */}
                <button
                  type="button"
                  onClick={() => setSelected(p)}
                  title={isVi ? "Nhấn để phóng to & tải mã QR" : "Click to enlarge & download QR"}
                  className="group relative shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition-transform hover:scale-105"
                >
                  <QRCodeSVG value={verifyUrl} size={76} level="M" includeMargin={false} />
                  <span className="mt-1 block text-center font-mono text-[10px] font-semibold text-emerald-700 group-hover:underline">
                    QR Code
                  </span>
                </button>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {p.publicCode}
                    </span>
                    <Badge variant={p.status === "VALID" ? "success" : "danger"}>
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{p.productName}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>
                      {isVi ? "Phát thải nhúng:" : "Embedded:"}{" "}
                      <strong className="text-slate-800">
                        <Co2eValue kg={p.totalPerUnit} />
                      </strong>
                      /{isVi ? "đv" : "unit"}
                    </span>
                    {p.periodName && <span>• {p.periodName}</span>}
                  </div>
                  <p className="truncate max-w-[260px] font-mono text-[11px] text-slate-400">
                    SHA-256: {p.hash.slice(0, 20)}...
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
                <Button size="sm" variant="primary" onClick={() => setSelected(p)}>
                  {isVi ? "Mã QR & Chi tiết" : "QR & Details"}
                </Button>
                <a
                  href={`/verify/${p.publicCode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {isVi ? "Trang xác thực ↗" : "Verify page ↗"}
                </a>
              </div>
            </Card>
          );
        })}
      </div>

      {(passports.data ?? []).length === 0 && (
        <Card>
          <p className="py-8 text-center text-xs text-slate-500">{t("common.empty")}</p>
        </Card>
      )}

      {periodId && (
        <IssuePassportDialog
          open={issueOpen}
          onOpenChange={setIssueOpen}
          periodId={periodId}
          products={products.data ?? []}
          onIssued={(issued) => {
            void queryClient.invalidateQueries({ queryKey: keys.passports(periodId) });
            if (issued) setSelected(issued);
          }}
        />
      )}

      <PassportDetailDrawer
        passport={selected}
        onClose={() => setSelected(null)}
        onRevoke={
          isOwner
            ? async (id) => {
                await passportsApi.revoke(id, "Revoked by owner");
                setSelected(null);
                if (periodId) {
                  await queryClient.invalidateQueries({ queryKey: keys.passports(periodId) });
                }
              }
            : undefined
        }
      />
    </div>
  );
}

export default PassportsPage;
