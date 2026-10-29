import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { DocumentItem } from "@/types/domain";

export interface DataProgressProps {
  documents: DocumentItem[];
}

export function DataProgress({ documents }: DataProgressProps) {
  const { t } = useTranslation();
  const entered = documents.filter((d) => d.status === "ENTERED").length;
  const pending = documents.filter((d) => d.status === "PENDING_ENTRY").length;

  return (
    <Card title={t("dashboard.dataProgress")}>
      <p className="text-sm text-slate-700">
        {entered} / {documents.length} ({pending} {t("documents.status.PENDING_ENTRY")})
      </p>
      {pending > 0 && (
        <div className="mt-3">
          <Link to="/documents">
            <Button size="sm" variant="secondary">
              {t("documents.enterSequentially")}
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
