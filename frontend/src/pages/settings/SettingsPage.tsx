import { useTranslation } from "react-i18next";
import { Tabs } from "@/components/ui/Tabs";
import { usePermission } from "@/hooks/usePermission";
import { OrganizationTab } from "@/pages/settings/OrganizationTab";
import { PreferencesTab } from "@/pages/settings/PreferencesTab";
import { UsersTab } from "@/pages/settings/UsersTab";

export function SettingsPage() {
  const { t } = useTranslation();
  const { isOwner } = usePermission();

  const items = [
    ...(isOwner
      ? [
          { value: "org", label: t("settings.organizationTab"), content: <OrganizationTab /> },
          { value: "users", label: t("settings.usersTab"), content: <UsersTab /> },
        ]
      : []),
    { value: "prefs", label: t("settings.preferencesTab"), content: <PreferencesTab /> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-900">{t("settings.title")}</h1>
      <Tabs items={items} />
    </div>
  );
}

export default SettingsPage;
