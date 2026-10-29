import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useCurrentContext } from "@/hooks/useCurrentContext";

export function AppShell() {
  const { t } = useTranslation();
  const { isLocked } = useCurrentContext();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        {isLocked && (
          <div
            role="status"
            className="border-b border-warning/30 bg-warning-light px-4 py-1.5 text-xs font-medium text-warning-dark"
          >
            🔒 {t("common.lockedPeriod")}
          </div>
        )}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
