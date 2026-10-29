import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-danger/30 bg-danger-light/40 px-6 py-8 text-center"
    >
      <p className="text-sm font-medium text-danger-dark">{message ?? t("errors.UNKNOWN")}</p>
      {onRetry && (
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        </div>
      )}
    </div>
  );
}
