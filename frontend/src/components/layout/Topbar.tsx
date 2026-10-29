import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut } from "lucide-react";
import { ContextSwitcher } from "@/components/layout/ContextSwitcher";
import { Button } from "@/components/ui/Button";
import { setLanguage } from "@/i18n";
import { useAuthStore } from "@/stores/authStore";
import { useContextStore } from "@/stores/contextStore";

export function Topbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const resetContext = useContextStore((s) => s.reset);
  const currentLang = i18n.language.startsWith("en") ? "en" : "vi";

  const handleLogout = () => {
    logout();
    resetContext();
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((w) => w[0])
        .slice(-2)
        .join("")
        .toUpperCase()
    : "ET";

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur-md sticky top-0 z-20">
      {/* Left: Organization & Facility Switcher */}
      <ContextSwitcher />

      {/* Right: Language, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Language Pill */}
        <div className="flex items-center rounded-xl border border-slate-200/80 bg-slate-50 p-1 text-xs">
          <button
            type="button"
            onClick={() => setLanguage("vi")}
            className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
              currentLang === "vi" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            VI
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
              currentLang === "en" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            EN
          </button>
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="Thông báo"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </button>

        {/* User Profile Pill */}
        {user && (
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 py-1.5 pl-2 pr-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-bold text-white shadow-xs">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user.fullName}</p>
              <p className="text-[10px] font-medium text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 text-xs font-semibold"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("nav.logout")}</span>
        </Button>
      </div>
    </header>
  );
}
