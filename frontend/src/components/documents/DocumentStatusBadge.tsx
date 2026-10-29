import { useTranslation } from "react-i18next";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import type { DocumentStatus } from "@/types/domain";

export interface DocumentStatusBadgeProps {
  status: DocumentStatus;
}

const STATUS_VARIANTS: Record<DocumentStatus, BadgeVariant> = {
  PENDING_ENTRY: "warning",
  ENTERED: "success",
  REJECTED: "neutral",
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const { t } = useTranslation();
  return <Badge variant={STATUS_VARIANTS[status]}>{t(`documents.status.${status}`)}</Badge>;
}
