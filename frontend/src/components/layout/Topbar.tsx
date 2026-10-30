import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ContextSwitcher } from "@/components/layout/ContextSwitcher";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { useAuthStore } from "@/stores/authStore";
import { useContextStore } from "@/stores/contextStore";

export interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const resetContext = useContextStore((s) => s.reset);

  const handleLogout = () => {
    logout();
    resetContext();
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex min-h-[72px] flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="h-10 shrink-0 rounded-2xl bg-white px-4 text-sm font-semibold text-ink lg:hidden"
      >
        {t("nav.menu")}
      </button>
      <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
        <ContextSwitcher />
      </div>
      <div className="flex items-center gap-3">
        <LanguageSwitch />
        <button
          type="button"
          onClick={handleLogout}
          className="h-10 rounded-2xl bg-ink px-4 text-sm font-semibold text-white transition-colors duration-hover hover:bg-ink-700"
        >
          {t("nav.logout")}
        </button>
      </div>
    </header>
  );
}
