import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setLanguage } from "@/i18n";

export function PublicLayout() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith("en") ? "en" : "vi";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/login" className="flex items-center gap-2 font-bold text-brand-800">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand text-xs text-white">
              ET
            </span>
            <span>{t("common.appName")}</span>
          </Link>
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setLanguage("vi")}
              className={`rounded px-2 py-1 font-medium ${
                currentLang === "vi" ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`rounded px-2 py-1 font-medium ${
                currentLang === "en" ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
