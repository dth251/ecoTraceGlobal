import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { useFacilities } from "@/queries/useFacilities";
import { usePeriods } from "@/queries/usePeriods";
import { useContextStore } from "@/stores/contextStore";

export function ContextSwitcher() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { facilityId, periodId, setFacility, setPeriod } = useContextStore();
  const facilities = useFacilities();
  const periods = usePeriods(facilityId);

  // Khởi tạo nhà máy đầu tiên nếu chưa chọn
  useEffect(() => {
    const urlFacility = searchParams.get("facility");
    if (urlFacility && urlFacility !== facilityId) {
      setFacility(urlFacility);
      return;
    }
    if (!facilityId && facilities.data && facilities.data.length > 0) {
      setFacility(facilities.data[0].id);
    }
  }, [facilities.data, facilityId, searchParams, setFacility]);

  // Khởi tạo kỳ báo cáo đầu tiên nếu chưa chọn
  useEffect(() => {
    const urlPeriod = searchParams.get("period");
    if (urlPeriod && urlPeriod !== periodId) {
      setPeriod(urlPeriod);
      return;
    }
    if (!periodId && periods.data && periods.data.length > 0) {
      setPeriod(periods.data[0].id);
    }
  }, [periods.data, periodId, searchParams, setPeriod]);

  // Nhà máy hoặc kỳ đã lưu không còn trong danh sách (ví dụ mã mẫu cũ): chọn lại cho khớp dữ liệu hiện có
  useEffect(() => {
    if (facilityId && facilities.data && !facilities.data.some((f) => f.id === facilityId)) {
      setFacility(facilities.data[0]?.id ?? "");
    }
  }, [facilities.data, facilityId, setFacility]);

  useEffect(() => {
    if (periodId && periods.data && !periods.data.some((p) => p.id === periodId)) {
      setPeriod(periods.data[0]?.id ?? "");
    }
  }, [periods.data, periodId, setPeriod]);

  const currentPeriod = periods.data?.find((p) => p.id === periodId) ?? null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="ctx-facility">
        {t("common.facility")}
      </label>
      <select
        id="ctx-facility"
        aria-label={t("common.facility")}
        value={facilityId ?? ""}
        onChange={(e) => {
          const nextId = e.target.value;
          setFacility(nextId);
          const next = new URLSearchParams(searchParams);
          next.set("facility", nextId);
          next.delete("period");
          setSearchParams(next, { replace: true });
        }}
        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
      >
        <option value="" disabled>
          {t("common.selectFacility")}
        </option>
        {(facilities.data ?? []).map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="ctx-period">
        {t("common.period")}
      </label>
      <select
        id="ctx-period"
        aria-label={t("common.period")}
        value={periodId ?? ""}
        onChange={(e) => {
          const nextId = e.target.value;
          setPeriod(nextId);
          const next = new URLSearchParams(searchParams);
          next.set("period", nextId);
          setSearchParams(next, { replace: true });
        }}
        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
      >
        <option value="" disabled>
          {t("common.selectPeriod")}
        </option>
        {(periods.data ?? []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {currentPeriod && (
        <Badge variant={currentPeriod.status === "LOCKED" ? "warning" : "success"}>
          {currentPeriod.status === "LOCKED" ? t("common.locked") : t("common.openPeriod")}
        </Badge>
      )}
    </div>
  );
}
