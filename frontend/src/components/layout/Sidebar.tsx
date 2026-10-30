import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { Logo } from "@/components/layout/Logo";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { useDocuments } from "@/queries/useDocuments";
import { useAuthStore } from "@/stores/authStore";

const NAV_ITEMS = [
  { to: "/dashboard", key: "nav.dashboard" },
  { to: "/documents", key: "nav.documents", showPendingBadge: true },
  { to: "/imports", key: "nav.imports" },
  { to: "/activities", key: "nav.activities" },
  { to: "/products", key: "nav.products" },
  { to: "/optimizer", key: "nav.optimizer" },
  { to: "/reports", key: "nav.reports" },
  { to: "/passports", key: "nav.passports" },
  { to: "/ai-assistant", key: "nav.aiAssistant" },
  { to: "/settings", key: "nav.settings" },
] as const;

export function Sidebar() {
  const { t } = useTranslation();
  const { periodId } = useCurrentContext();
  const user = useAuthStore((s) => s.user);
  const docs = useDocuments(periodId);
  const pendingCount = (docs.data ?? []).filter((d) => d.status === "PENDING_ENTRY").length;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto bg-ink px-4 py-6 text-white">
      <div className="px-3">
        <Logo dark />
      </div>

      {user && (
        <div className="mt-10 px-3">
          <p className="text-base font-bold leading-tight">{user.fullName}</p>
          <p className="mt-1 truncate text-sm text-ink-muted">{user.email}</p>
          <p className="mt-1 text-sm text-ink-muted">{user.organizationName}</p>
        </div>
      )}

      <nav aria-label="Main" className="mt-10 flex-1 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                "flex items-center justify-between rounded-2xl px-3 py-2.5 text-[15px] font-semibold",
                "transition-[background-color,color,transform] duration-hover ease-smooth",
                isActive ? "bg-ink-700 text-white" : "text-ink-muted hover:translate-x-1 hover:text-white",
              )
            }
          >
            {t(item.key)}
            {"showPendingBadge" in item && item.showPendingBadge && pendingCount > 0 && (
              <span className="min-w-6 rounded-full bg-brand-500 px-2 text-center text-xs font-bold leading-6 text-ink">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
