import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { setLanguage } from "@/i18n";
import { formatPercent } from "@/lib/format";
import { usePublicVerification } from "@/queries/usePassports";
import { aiApi, type PassportAuditResponse } from "@/api/ai";
import { useState } from "react";

export function PublicVerifyPage() {
  const { code } = useParams<{ code: string }>();
  const { t, i18n } = useTranslation();
  const verification = usePublicVerification(code);
  const [auditResult, setAuditResult] = useState<PassportAuditResponse | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const handleRunAiAudit = async () => {
    if (!code) return;
    setLoadingAudit(true);
    try {
      const res = await aiApi.auditPassport(code);
      setAuditResult(res);
    } catch (e) {
      console.error(e);
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

  return (
    <Card className="w-full max-w-md space-y-3 p-5 text-base">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">{t("verify.title")}</h1>
          <p className="font-mono text-xs text-slate-500">{code}</p>
        </div>
        <Badge variant={isValid ? "success" : "danger"}>
          {isValid ? `✅ ${t("verify.valid")}` : `⛔ ${t("verify.revoked")}`}
        </Badge>
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
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
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
          <dd className="mt-0.5 break-all font-mono text-[11px] text-slate-700">{d.hash}</dd>
        </div>
      </dl>

      <div className="pt-2 border-t border-slate-100">
        <Button
          type="button"
          variant="secondary"
          className="w-full text-xs"
          loading={loadingAudit}
          onClick={handleRunAiAudit}
        >
          🤖 {loadingAudit ? "AI is reviewing compliance..." : "Verify with AI Audit Agent"}
        </Button>
      </div>

      {auditResult && (
        <div className="mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">EU CBAM AI Readiness Score</span>
            <Badge variant={auditResult.readinessScore >= 80 ? "success" : "warning"}>
              {auditResult.readinessScore}/100
            </Badge>
          </div>
          <p className="text-slate-600 italic">&ldquo;{auditResult.overallAssessment}&rdquo;</p>

          <div className="space-y-1.5 pt-1.5">
            {auditResult.checks.map((chk, i) => (
              <div key={i} className="rounded bg-white p-2 border border-slate-100">
                <div className="flex items-center justify-between font-medium">
                  <span>{chk.title}</span>
                  <span
                    className={
                      chk.status === "PASSED"
                        ? "text-success font-semibold"
                        : chk.status === "WARNING"
                        ? "text-amber-600 font-semibold"
                        : "text-danger font-semibold"
                    }
                  >
                    {chk.status === "PASSED" ? "✓" : "⚠"} {chk.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{chk.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default PublicVerifyPage;
