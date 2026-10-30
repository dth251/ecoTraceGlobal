import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { activitiesApi } from "@/api/activities";
import { ApiError } from "@/api/client";
import { emissionsApi } from "@/api/emissions";
import { ChartCard, DataTable, LegendItem } from "@/components/charts/ChartCard";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { ProductIntensityChart } from "@/components/charts/ProductIntensityChart";
import { RankedBarChart } from "@/components/charts/RankedBarChart";
import { ShareBar } from "@/components/charts/ShareBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { usePermission } from "@/hooks/usePermission";
import { formatCo2e, formatDate, formatNumber, formatPercent } from "@/lib/format";
import { EVIDENCE_COLORS, SCOPE_COLORS, scopeKey } from "@/lib/scopeColors";
import { keys } from "@/queries/keys";
import { useDocuments } from "@/queries/useDocuments";
import { useFootprints } from "@/queries/useProducts";
import { useSummary } from "@/queries/useSummary";

const SCOPES = ["scope1", "scope2", "scope3"] as const;
const EVIDENCE = ["DOCUMENT", "IMPORT", "MANUAL"] as const;

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";
  const queryClient = useQueryClient();
  const { periodId, period, isLocked } = useCurrentContext();
  const { canEdit } = usePermission();
  const summaryQuery = useSummary(periodId);
  const docsQuery = useDocuments(periodId);
  const footprintsQuery = useFootprints(periodId);
  const activitiesQuery = useQuery({
    queryKey: keys.activities(periodId ?? "", {}),
    queryFn: () => activitiesApi.list(periodId!),
    enabled: !!periodId,
  });
  const [calculating, setCalculating] = useState(false);

  const co2 = (kg: number) => formatCo2e(kg, lang);
  const pct = (r: number) => formatPercent(r, lang, 0);

  const recalculate = async () => {
    if (!periodId) return;
    setCalculating(true);
    try {
      const res = await emissionsApi.calculate(periodId);
      toast.success(t("dashboard.recalculated", { count: res.recordsCalculated }));
      void queryClient.invalidateQueries({ queryKey: keys.summary(periodId) });
      void queryClient.invalidateQueries({ queryKey: ["footprints"] });
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
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
  const activities = activitiesQuery.data ?? [];

  // Phát thải theo nguồn gốc số liệu, tính theo khối lượng CO₂e
  const evidenceKg = EVIDENCE.map((m) =>
    activities.filter((a) => (a.entryMethod ?? "MANUAL") === m).reduce((s, a) => s + Number(a.co2eKg ?? 0), 0),
  );
  const evidenceTotal = evidenceKg.reduce((s, v) => s + v, 0);
  const evidencedShare = evidenceTotal > 0 ? (evidenceKg[0] + evidenceKg[1]) / evidenceTotal : 0;

  const header = (
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
  );

  if (!summary) {
    return (
      <div className="space-y-8">
        {header}
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (summary.totalKg <= 0) {
    return (
      <div className="space-y-8">
        {header}
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
      </div>
    );
  }

  const scopeSegments = SCOPES.map((s) => ({
    key: s,
    label: t(`common.${s}`),
    value: summary.byScope[s],
    color: SCOPE_COLORS[s],
    display: co2(summary.byScope[s]),
  }));

  const sourceItems = summary.topSources.map((src) => ({
    name: src.subCategory
      ? `${t(`activities.categories.${src.category.split("/")[0]}`)} · ${t(`activities.subTypes.${src.subCategory}`, src.subCategory)}`
      : t(`activities.categories.${src.category}`, src.category),
    value: src.co2eKg / 1000,
    color: SCOPE_COLORS[scopeKey(src.scope ?? 1)],
  }));

  const evidenceSegments = EVIDENCE.map((m, i) => ({
    key: m,
    label: t(`activities.entryMethods.${m}`),
    value: evidenceKg[i],
    color: EVIDENCE_COLORS[m],
    display: co2(evidenceKg[i]),
  }));

  const tco2 = (v: number) => `${formatNumber(v, lang, 2)} tCO₂e`;

  return (
    <div className="space-y-8">
      {header}

      {/* Số tổng: không phải biểu đồ mà là con số chính */}
      <section className="card-surface grid gap-8 p-6 sm:grid-cols-3 sm:p-8">
        <div>
          <p className="text-sm font-medium text-slate-600">{t("dashboard.statTotal")}</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink tabular-nums">{co2(summary.totalKg)}</p>
          {summary.calculatedAt && (
            <p className="mt-1 text-sm text-slate-600">
              {t("dashboard.calculatedAt")} {formatDate(summary.calculatedAt, lang)}
            </p>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">{t("dashboard.statEvidenced")}</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink tabular-nums">{pct(evidencedShare)}</p>
          <p className="mt-1 text-sm text-slate-600">{t("dashboard.statEvidencedHint")}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">{t("dashboard.statActivities")}</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink tabular-nums">{activities.length}</p>
          <p className="mt-1 text-sm text-slate-600">
            {documents.length - pending}/{documents.length} {t("dashboard.documentsEntered")}
            {pending > 0 && (
              <Link to="/documents" className="ml-2 font-semibold text-brand-700 hover:underline">
                {t("documents.enterSequentially")}
              </Link>
            )}
          </p>
        </div>
      </section>

      <ChartCard
        title={t("dashboard.scopeTitle")}
        description={t("dashboard.scopeDesc")}
        table={
          <DataTable
            head={[t("dashboard.col.item"), t("dashboard.col.value"), t("dashboard.col.share")]}
            rows={scopeSegments.map((s) => [s.label, s.display, pct(s.value / summary.totalKg)])}
          />
        }
      >
        <ShareBar segments={scopeSegments} formatPercent={pct} />
        <ul className="mt-4 grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-3">
          {SCOPES.map((s) => (
            <li key={s}>{t(`dashboard.scopeMeaning.${s}`)}</li>
          ))}
        </ul>
      </ChartCard>

      <div className="grid gap-8 xl:grid-cols-2">
        <ChartCard
          title={t("dashboard.monthlyTrend")}
          description={t("dashboard.monthlyDesc")}
          legend={SCOPES.map((s) => <LegendItem key={s} color={SCOPE_COLORS[s]} label={t(`common.${s}`)} />)}
          table={
            <DataTable
              head={[t("dashboard.col.month"), ...SCOPES.map((s) => t(`common.${s}`)), t("dashboard.col.total")]}
              rows={summary.byMonth.map((m) => [
                m.month,
                co2(m.scope1),
                co2(m.scope2),
                co2(m.scope3),
                co2(m.scope1 + m.scope2 + m.scope3),
              ])}
            />
          }
        >
          <MonthlyTrendChart data={summary.byMonth} />
        </ChartCard>

        <ChartCard
          title={t("dashboard.topSources")}
          description={t("dashboard.sourcesDesc")}
          legend={SCOPES.map((s) => <LegendItem key={s} color={SCOPE_COLORS[s]} label={t(`common.${s}`)} />)}
          table={
            <DataTable
              head={[t("dashboard.col.item"), t("dashboard.col.value"), t("dashboard.col.share")]}
              rows={sourceItems.map((s) => [s.name, tco2(s.value), pct((s.value * 1000) / summary.totalKg)])}
            />
          }
        >
          <RankedBarChart
            items={sourceItems}
            format={tco2}
            labelFormat={(v) => `${formatNumber(v, lang, 1)} t (${pct((v * 1000) / summary.totalKg)})`}
          />
        </ChartCard>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <ChartCard
          title={t("dashboard.evidenceTitle")}
          description={t("dashboard.evidenceDesc")}
          table={
            <DataTable
              head={[t("dashboard.col.item"), t("dashboard.col.value"), t("dashboard.col.share")]}
              rows={evidenceSegments.map((s) => [s.label, s.display, pct(evidenceTotal > 0 ? s.value / evidenceTotal : 0)])}
            />
          }
        >
          <ShareBar segments={evidenceSegments} formatPercent={pct} />
        </ChartCard>

        <ChartCard
          title={t("dashboard.productIntensity")}
          description={t("dashboard.productDesc")}
          legend={
            footprints.length > 0 && (
              <>
                <LegendItem color={SCOPE_COLORS.scope1} label={t("dashboard.parts.direct")} />
                <LegendItem color={SCOPE_COLORS.scope2} label={t("dashboard.parts.indirect")} />
                <LegendItem color={SCOPE_COLORS.scope3} label={t("dashboard.parts.precursor")} />
              </>
            )
          }
          table={
            footprints.length > 0 ? (
              <DataTable
                head={[t("dashboard.col.product"), t("dashboard.parts.direct"), t("dashboard.parts.indirect"), t("dashboard.parts.precursor"), t("dashboard.col.total")]}
                rows={footprints.map((f) => [
                  f.productName,
                  formatNumber(Number(f.directPerUnit), lang, 2),
                  formatNumber(Number(f.indirectPerUnit), lang, 2),
                  formatNumber(Number(f.precursorPerUnit), lang, 2),
                  `${formatNumber(Number(f.totalPerUnit), lang, 2)} kgCO₂e`,
                ])}
              />
            ) : undefined
          }
        >
          {footprints.length === 0 ? (
            <p className="text-sm text-slate-600">
              {t("dashboard.noFootprints")}{" "}
              <Link to="/products" className="font-semibold text-brand-700 hover:underline">
                {t("nav.products")}
              </Link>
            </p>
          ) : (
            <ProductIntensityChart footprints={footprints} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default DashboardPage;
