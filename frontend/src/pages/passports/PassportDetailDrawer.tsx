import { useTranslation } from "react-i18next";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import type { Passport } from "@/types/domain";

export interface PassportDetailDrawerProps {
  passport: Passport | null;
  onClose: () => void;
  onRevoke?: (id: string) => void;
}

export function PassportDetailDrawer({ passport, onClose, onRevoke }: PassportDetailDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer
      open={!!passport}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={passport?.publicCode ?? ""}
      description={passport?.productName}
    >
      {passport && (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span>Status</span>
            <Badge variant={passport.status === "VALID" ? "success" : "danger"}>
              {passport.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Emissions / unit</span>
            <Co2eValue kg={passport.totalPerUnit} />
          </div>
          <div>
            <p className="text-slate-500">SHA-256</p>
            <p className="mt-0.5 break-all font-mono text-[11px]">{passport.hash}</p>
          </div>
          {onRevoke && passport.status === "VALID" && (
            <div className="pt-3">
              <Button variant="danger" size="sm" onClick={() => onRevoke(passport.id)}>
                {t("passports.revoke")}
              </Button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
