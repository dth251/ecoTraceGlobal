import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { setLanguage } from "@/i18n";
import { formatPercent } from "@/lib/format";
import { usePublicVerification } from "@/queries/usePassports";
import { aiApi, type PassportReadiness } from "@/api/ai";
import { PassportReadinessView } from "@/pages/passports/PassportReadinessView";

export function PublicVerifyPage() {
  const { code } = useParams<{ code: string }>();
  const { t, i18n } = useTranslation();
  const verification = usePublicVerification(code);
  const [auditResult, setAuditResult] = useState<PassportReadiness | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const handleRunAiAudit = async () => {
    if (!code) return;
    setLoadingAudit(true);
    setAuditError(null);
    try {
      setAuditResult(await aiApi.auditPassport(code, i18n.language.startsWith("en") ? "en" : "vi"));
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setLoadingAudit(false);
    }
  };

  // Mặc định tiếng Anh cho người mua quốc tế
  useEffect(() => {
    if (!localStorage.getItem("lang")) {
      setLanguage("en");
    }
  }, []);

  if (verification.isLoading) {
    return <Skeleton className="h-72 w-full max-w-md" />;
  }

  if (verification.isError || !verification.data) {
    return (
      <Card className="w-full max-w-md text-center">
        <Badge variant="neutral">{t("verify.notFound")}</Badge>
        <p className="mt-2 font-mono text-xs text-slate-500">{code}</p>
      </Card>
    );
  }

  const d = verification.data;
  const isValid = d.status === "VALID" && d.signatureValid;
  const lang = i18n.language.startsWith("en") ? "en" : "vi";
  const verifyUrl = `${window.location.origin}/verify/${code ?? ""}`;

  return (
    <Card className="w-full max-w-md space-y-3 p-5 text-base">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="space-y-1">
          <h1 className="text-base font-bold text-slate-900">{t("verify.title")}</h1>
          <p className="font-mono text-xs font-semibold text-emerald-700">{code}</p>
          <Badge variant={isValid ? "success" : "danger"}>
            {isValid ? t("verify.valid") : t("verify.revoked")}
          </Badge>
        </div>

        <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <QRCodeSVG value={verifyUrl} size={72} level="M" includeMargin={false} />
        </div>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">{t("verify.company")}</dt>
          <dd className="font-medium text-slate-900">{d.companyName}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">{t("verify.product")}</dt>
          <dd className="font-medium text-slate-900">{d.productName}</dd>
        </div>
        {d.cnCode && (
          <div className="flex justify-between">
            <dt className="text-slate-500">{t("verify.cnCode")}</dt>
            <dd className="font-mono text-slate-900">{d.cnCode}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-slate-500">{t("verify.period")}</dt>
          <dd className="text-slate-900">{d.periodName}</dd>
        </div>
        <div className="border-t border-slate-100 pt-2">
          <p className="mb-1 text-xs font-semibold text-slate-500">
            {t("verify.embeddedEmissions")}
          </p>
          <div className="flex justify-between text-xs">
            <span>{t("verify.direct")}</span>
            <Co2eValue kg={d.directPerUnit} />
          </div>
          <div className="flex justify-between text-xs">
            <span>{t("verify.indirect")}</span>
            <Co2eValue kg={d.indirectPerUnit} />
          </div>
          <div className="flex justify-between text-xs">
            <span>{t("verify.precursors")}</span>
            <Co2eValue kg={d.precursorPerUnit} />
          </div>
          <div className="mt-1 flex justify-between font-bold">
            <span>{t("verify.total")}</span>
            <Co2eValue kg={d.totalPerUnit} />
          </div>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2 text-xs">
          <dt className="text-slate-500">{t("verify.actualDataShare")}</dt>
          <dd className="tabular-nums font-medium">{formatPercent(d.actualDataShare, lang)}</dd>
        </div>
        <div className="border-t border-slate-100 pt-2 text-xs">
          <dt className="text-slate-500">{t("verify.hash")}</dt>
          <dd className="mt-0.5 break-all font-mono text-xs text-slate-700">{d.hash}</dd>
        </div>
      </dl>

      <div className="border-t border-slate-100 pt-2">
        <Button
          type="button"
          variant="secondary"
          className="w-full text-xs"
          loading={loadingAudit}
          onClick={handleRunAiAudit}
        >
          {loadingAudit ? "Reviewing compliance..." : "Check passport requirements (AI)"}
        </Button>
      </div>

      {auditError && (
        <p className="rounded-md bg-danger-light p-2 text-xs text-danger-dark">{auditError}</p>
      )}
      {auditResult && (
        <div className="mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3.5">
          <PassportReadinessView result={auditResult} lang={lang} />
        </div>
      )}
    </Card>
  );
}

export default PublicVerifyPage;
