import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { setLanguage } from "@/i18n";

export function PreferencesTab() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";

  return (
    <Card title={t("settings.preferencesTab")}>
      <div className="max-w-xs">
        <Select
          label="Language / Ngôn ngữ"
          value={lang}
          onChange={(e) => setLanguage(e.target.value as "vi" | "en")}
          options={[
            { value: "vi", label: "Tiếng Việt" },
            { value: "en", label: "English" },
          ]}
        />
      </div>
    </Card>
  );
}
