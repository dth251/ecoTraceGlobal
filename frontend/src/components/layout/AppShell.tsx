import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { PageTransition } from "@/components/motion/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useCurrentContext } from "@/hooks/useCurrentContext";

export function AppShell() {
  const { t } = useTranslation();
  const { isLocked } = useCurrentContext();
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Đóng menu trên di động khi chuyển trang
  useEffect(() => setNavOpen(false), [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-ink">
      {/* Sidebar: cố định trên desktop, ngăn kéo trên di động */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-40 transition-transform duration-500 ease-smooth lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar />
      </div>
      {navOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-ink/60 lg:hidden"
        />
      )}

      {/* Panel nội dung sáng, bo góc lớn đặt trên nền tối */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface lg:my-3 lg:mr-3 lg:rounded-[32px]">
        <div className="flex-1 overflow-y-auto">
          <Topbar onMenuClick={() => setNavOpen(true)} />
          {isLocked && (
            <div
              role="status"
              className="bg-warning-light px-6 py-2 text-sm font-semibold text-warning-dark"
            >
              {t("common.lockedPeriod")}
            </div>
          )}
          <main className="perspective p-4 sm:p-6 lg:p-8">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </div>
      </div>
    </div>
  );
}
