import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { setLanguage } from "@/i18n";

export interface LanguageSwitchProps {
  /** Dùng trên nền tối */
  dark?: boolean;
}

export function LanguageSwitch({ dark = false }: LanguageSwitchProps) {
  const { i18n } = useTranslation();
  const current = i18n.language.startsWith("en") ? "en" : "vi";

  return (
    <div
      role="group"
      aria-label="Language"
      className={clsx(
        "flex items-center rounded-2xl p-1 text-xs",
        dark ? "bg-white/10" : "bg-white",
      )}
    >
      {(["vi", "en"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          aria-pressed={current === lang}
          onClick={() => setLanguage(lang)}
          className={clsx(
            "rounded-xl px-3 py-1.5 font-bold uppercase transition-all duration-300 ease-smooth",
            current === lang
              ? dark
                ? "bg-white text-ink"
                : "bg-ink text-white"
              : dark
                ? "text-ink-muted hover:text-white"
                : "text-slate-600 hover:text-ink",
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
