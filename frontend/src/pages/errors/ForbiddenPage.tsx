import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

export function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <p className="text-4xl font-bold text-danger">403</p>
      <h1 className="mt-2 text-lg font-semibold text-slate-900">{t("errors.forbiddenTitle")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("errors.forbiddenMessage")}</p>
      <div className="mt-4">
        <Link to="/dashboard">
          <Button variant="secondary">{t("nav.dashboard")}</Button>
        </Link>
      </div>
    </div>
  );
}

export default ForbiddenPage;
