import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import {
  Activity,
  Award,
  Bot,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { useDocuments } from "@/queries/useDocuments";

const NAV_ITEMS = [
  { to: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/documents", key: "nav.documents", icon: FileText, showPendingBadge: true },
  { to: "/imports", key: "nav.imports", icon: UploadCloud },
  { to: "/activities", key: "nav.activities", icon: Activity },
  { to: "/products", key: "nav.products", icon: Package },
  { to: "/optimizer", key: "nav.optimizer", icon: Sparkles },
  { to: "/reports", key: "nav.reports", icon: FileSpreadsheet },
  { to: "/passports", key: "nav.passports", icon: Award },
  { to: "/ai-assistant", key: "nav.aiAssistant", icon: Bot, isAi: true },
  { to: "/settings", key: "nav.settings", icon: Settings },
] as const;

export function Sidebar() {
  const { t } = useTranslation();
  const { periodId } = useCurrentContext();
  const docs = useDocuments(periodId);
  const pendingCount = (docs.data ?? []).filter((d) => d.status === "PENDING_ENTRY").length;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white shadow-sm">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
        <div className="flex items-center gap-2.5 font-bold text-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-emerald-400 text-white shadow-md shadow-brand/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-slate-900">
              {t("common.appName")}
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                AI Platform
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">Carbon Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav Section */}
      <nav className="flex-1 space-y-1 p-3">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Analytics & ESG
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={clsx(
                    "h-4 w-4 transition-colors",
                    "isAi" in item && item.isAi ? "text-emerald-500" : "text-slate-400 group-hover:text-slate-700",
                  )}
                />
                <span>{t(item.key)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {"isAi" in item && item.isAi && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                )}
                {"showPendingBadge" in item && item.showPendingBadge && pendingCount > 0 && (
                  <Badge variant="warning">{pendingCount}</Badge>
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Info Card */}
      <div className="p-3">
        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-emerald-50/40 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold">
              AI
            </div>
            <span className="text-xs font-bold text-slate-800">Shopify & CBAM Ready</span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
            Hộ chiếu số sản phẩm và tối ưu hóa phát thải tự động theo tiêu chuẩn quốc tế.
          </p>
        </div>
      </div>
    </aside>
  );
}
