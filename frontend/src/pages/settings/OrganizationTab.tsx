import { useState } from "react";
import { useTranslation } from "react-i18next";
import { organizationApi } from "@/api/organization";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";

export function OrganizationTab() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.organizationName ?? "");
  const [taxCode, setTaxCode] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await organizationApi.update({ name, taxCode: taxCode || null });
  };

  return (
    <Card title={t("settings.organizationTab")}>
      <form onSubmit={handleSave} className="max-w-md space-y-3">
        <Input
          label={t("auth.organizationName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label={t("auth.taxCode")}
          value={taxCode}
          onChange={(e) => setTaxCode(e.target.value)}
        />
        <Button type="submit" size="sm">
          {t("common.save")}
        </Button>
      </form>
    </Card>
  );
}
