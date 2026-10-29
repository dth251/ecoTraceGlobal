import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { emissionsApi } from "@/api/emissions";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { usePermission } from "@/hooks/usePermission";
import { formatDate, formatPercent } from "@/lib/format";
import { SCOPE_COLORS } from "@/lib/scopeColors";
import { keys } from "@/queries/keys";
import { useDocuments } from "@/queries/useDocuments";
import { useFootprints } from "@/queries/useProducts";
import { useSummary } from "@/queries/useSummary";

const SCOPES = ["scope1", "scope2", "scope3"] as const;

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";
  const queryClient = useQueryClient();
  const { periodId, period, isLocked } = useCurrentContext();
  const { canEdit } = usePermission();
  const summaryQuery = useSummary(periodId);
  const docsQuery = useDocuments(periodId);
  const footprintsQuery = useFootprints(periodId);
  const [calculating, setCalculating] = useState(false);

  const recalculate = async () => {
    if (!periodId) return;
    setCalculating(true);
    try {
      const res = await emissionsApi.calculate(periodId);
      toast.success(t("dashboard.recalculated", { count: res.recordsCalculated }));
      void queryClient.invalidateQueries({ queryKey: keys.summary(periodId) });
      void queryClient.invalidateQueries({ queryKey: ["footprints"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("errors.UNKNOWN"));
    } finally {
      setCalculating(false);
    }
  };

  if (!periodId) {
    return <EmptyState title={t("dashboard.noPeriodTitle")} description={t("dashboard.noPeriodDescription")} />;
  }
  if (summaryQuery.isError) return <ErrorState onRetry={() => void summaryQuery.refetch()} />;

  const summary = summaryQuery.data;
  const documents = docsQuery.data ?? [];
  const pending = documents.filter((d) => d.status === "PENDING_ENTRY").length;
  const footprints = footprintsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">{t("dashboard.title")}</h1>
          {period && (
            <p className="mt-1 text-sm text-slate-600">
              {period.name} · {formatDate(period.startDate, lang)} – {formatDate(period.endDate, lang)}
            </p>
          )}
        </div>
        {canEdit && !isLocked && (
          <Button variant="secondary" loading={calculating} onClick={() => void recalculate()}>
            {t("dashboard.recalculate")}
          </Button>
        )}
      </header>

      {!summary ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : summary.totalKg <= 0 ? (
        <EmptyState
          title={t("dashboard.emptyTitle")}
          description={t("dashboard.emptyDescription")}
          action={
            <>
              <Link to="/documents">
                <Button>{t("dashboard.uploadFirstDoc")}</Button>
              </Link>
              <Link to="/activities">
                <Button variant="secondary">{t("activities.addManual")}</Button>
              </Link>
            </>
          }
        />
      ) : (
        <>
          {/* Tổng và cơ cấu theo scope */}
          <section className="card-surface p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-slate-600">{t("dashboard.totalEmissions")}</p>
                <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
                  <Co2eValue kg={summary.totalKg} />
                </p>
              </div>
              {summary.calculatedAt && (
                <p className="text-sm text-slate-600">
                  {t("dashboard.calculatedAt")} {formatDate(summary.calculatedAt, lang)}
                </p>
              )}
            </div>

            <div className="mt-8 flex h-3 w-full overflow-hidden rounded-full bg-surface">
              {SCOPES.map((s) => (
                <div
                  key={s}
                  style={{ width: `${(summary.byScope[s] / summary.totalKg) * 100}%`, background: SCOPE_COLORS[s] }}
                />
              ))}
            </div>
            <dl className="mt-6 grid gap-6 sm:grid-cols-3">
              {SCOPES.map((s) => (
                <div key={s}>
                  <dt className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: SCOPE_COLORS[s] }} />
                    {t(`common.${s}`)}
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-ink">
                    <Co2eValue kg={summary.byScope[s]} />
                    <span className="ml-2 text-sm font-medium text-slate-600">
                      {formatPercent(summary.byScope[s] / summary.totalKg, lang, 0)}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid gap-8 lg:grid-cols-5">
            <section className="card-surface p-6 lg:col-span-3">
              <h2 className="text-lg font-bold text-ink">{t("dashboard.monthlyTrend")}</h2>
              <div className="mt-4">
                <MonthlyTrendChart data={summary.byMonth} />
              </div>
            </section>

            <section className="rounded-3xl bg-ink p-6 text-white lg:col-span-2">
              <h2 className="text-lg font-bold">{t("dashboard.topSources")}</h2>
              <ol className="mt-5 space-y-4">
                {summary.topSources.map((src) => {
                  const [cat, sub] = src.category.split("/");
                  return (
                    <li key={src.category}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span>
                          {t(`activities.categories.${cat}`, cat)}
                          {sub && <span className="text-ink-muted"> · {t(`activities.subTypes.${sub}`, sub)}</span>}
                        </span>
                        <span className="font-semibold tabular-nums">
                          <Co2eValue kg={src.co2eKg} />
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-brand-400"
                          style={{ width: `${(src.co2eKg / summary.totalKg) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </>
      )}

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="card-surface p-6 lg:col-span-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-bold text-ink">{t("dashboard.productIntensity")}</h2>
            <Link to="/products" className="text-sm font-semibold text-brand-700 hover:underline">
              {t("nav.products")}
            </Link>
          </div>
          {footprints.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">{t("dashboard.noFootprints")}</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <tbody>
                {footprints.map((fp) => (
                  <tr key={fp.productId} className="odd:bg-surface/60">
                    <td className="rounded-l-xl px-3 py-3 font-medium text-ink">{fp.productName}</td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatPercent(Number(fp.actualDataShare ?? 0), lang, 0)} {t("dashboard.evidenced")}
                    </td>
                    <td className="rounded-r-xl px-3 py-3 text-right font-semibold tabular-nums text-ink">
                      <Co2eValue kg={Number(fp.totalPerUnit)} /> / {t("dashboard.unit")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card-surface p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-ink">{t("dashboard.dataProgress")}</h2>
          <p className="mt-4 text-3xl font-extrabold text-ink tabular-nums">
            {documents.length - pending}
            <span className="text-lg font-semibold text-slate-600"> / {documents.length}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">{t("dashboard.documentsEntered")}</p>
          {pending > 0 && (
            <Link to="/documents" className="mt-5 inline-block">
              <Button variant="secondary">{t("documents.enterSequentially")}</Button>
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
