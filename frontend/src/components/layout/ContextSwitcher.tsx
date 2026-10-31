import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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

  // Chọn lại nếu ID không còn tồn tại
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

  const currentFacility = facilities.data?.find((f) => f.id === facilityId) ?? null;
  const currentPeriod = periods.data?.find((p) => p.id === periodId) ?? null;

  const handleSelectFacility = (nextId: string) => {
    setFacility(nextId);
    const next = new URLSearchParams(searchParams);
    next.set("facility", nextId);
    next.delete("period");
    setSearchParams(next, { replace: true });
  };

  const handleSelectPeriod = (nextId: string) => {
    setPeriod(nextId);
    const next = new URLSearchParams(searchParams);
    next.set("period", nextId);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 1. Facility Selector */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="group inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs transition-all hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 active:scale-[0.98]"
          >
            <svg className="h-4 w-4 text-slate-500 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="max-w-[140px] truncate sm:max-w-[200px]">
              {currentFacility ? currentFacility.name : t("common.selectFacility")}
            </span>
            <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 min-w-[220px] overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95"
          >
            <DropdownMenu.Label className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("common.facility")}
            </DropdownMenu.Label>
            {(facilities.data ?? []).map((f) => {
              const active = f.id === facilityId;
              return (
                <DropdownMenu.Item
                  key={f.id}
                  onSelect={() => handleSelectFacility(f.id)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors outline-none ${
                    active ? "bg-brand/10 text-brand font-semibold" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-brand" : "bg-slate-300"}`} />
                    <span className="truncate">{f.name}</span>
                  </div>
                  {active && (
                    <svg className="h-4 w-4 text-brand shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* 2. Period Selector */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="group inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs transition-all hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 active:scale-[0.98]"
          >
            <svg className="h-4 w-4 text-slate-500 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="max-w-[100px] truncate sm:max-w-[140px]">
              {currentPeriod ? currentPeriod.name : t("common.selectPeriod")}
            </span>
            <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 min-w-[200px] overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95"
          >
            <DropdownMenu.Label className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("common.period")}
            </DropdownMenu.Label>
            {(periods.data ?? []).map((p) => {
              const active = p.id === periodId;
              return (
                <DropdownMenu.Item
                  key={p.id}
                  onSelect={() => handleSelectPeriod(p.id)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors outline-none ${
                    active ? "bg-brand/10 text-brand font-semibold" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${p.status === "LOCKED" ? "bg-amber-400" : "bg-emerald-500"}`} />
                    <span>{p.name}</span>
                  </div>
                  {active && (
                    <svg className="h-4 w-4 text-brand shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* 3. Period Status Pill */}
      {currentPeriod && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border shadow-2xs ${
            currentPeriod.status === "LOCKED"
              ? "bg-amber-50 text-amber-700 border-amber-200/80"
              : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              currentPeriod.status === "LOCKED" ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
            }`}
          />
          {currentPeriod.status === "LOCKED" ? t("common.locked") : t("common.openPeriod")}
        </span>
      )}
    </div>
  );
}
