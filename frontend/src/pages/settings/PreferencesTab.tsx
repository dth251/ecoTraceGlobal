import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { setLanguage } from "@/i18n";

export function PreferencesTab() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";

  return (
    <Card title={t("settings.preferencesTab")}>
      <div className="max-w-md space-y-3">
        <label className="text-sm font-semibold text-slate-700">Language / Ngôn ngữ</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setLanguage("vi")}
            className={`flex items-center justify-between rounded-xl border p-3.5 text-sm font-semibold transition-all ${
              lang === "vi"
                ? "border-brand bg-brand/5 text-brand shadow-xs ring-2 ring-brand/15"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🇻🇳</span>
              <span>Tiếng Việt</span>
            </div>
            {lang === "vi" && (
              <svg className="h-4 w-4 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`flex items-center justify-between rounded-xl border p-3.5 text-sm font-semibold transition-all ${
              lang === "en"
                ? "border-brand bg-brand/5 text-brand shadow-xs ring-2 ring-brand/15"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🇬🇧</span>
              <span>English</span>
            </div>
            {lang === "en" && (
              <svg className="h-4 w-4 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}
