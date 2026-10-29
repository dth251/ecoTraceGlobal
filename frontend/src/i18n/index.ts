import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/en.json";
import vi from "@/i18n/vi.json";

const defaultLang =
  (typeof window !== "undefined" ? localStorage.getItem("lang") : null) ??
  import.meta.env.VITE_DEFAULT_LANG ??
  "vi";

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: defaultLang,
  fallbackLng: "vi",
  interpolation: {
    escapeValue: false,
  },
});

export function setLanguage(lang: "vi" | "en") {
  if (typeof window !== "undefined") {
    localStorage.setItem("lang", lang);
  }
  void i18n.changeLanguage(lang);
}

export default i18n;
