import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationApi } from "@/api/organization";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Role } from "@/types/domain";

export function UsersTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: organizationApi.listUsers });
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("EDITOR");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;
    await organizationApi.inviteUser({ email: email.trim(), fullName: fullName.trim(), role });
    setEmail("");
    setFullName("");
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  return (
    <div className="space-y-4">
      <Card title={t("settings.usersTab")}>
        <form onSubmit={handleInvite} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <Input
            label={t("auth.fullName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input label={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={[
              { value: "EDITOR", label: "EDITOR" },
              { value: "VIEWER", label: "VIEWER" },
              { value: "OWNER", label: "OWNER" },
            ]}
          />
          <div className="flex items-end">
            <Button type="submit">{t("common.add")}</Button>
          </div>
        </form>

        <ul className="mt-4 divide-y divide-slate-100 text-xs">
          {(users.data ?? []).map((u) => (
            <li key={u.id} className="flex items-center justify-between py-2">
              <span>
                {u.fullName} ({u.email})
              </span>
              <Badge variant="info">{u.role}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
