import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <p className="text-4xl font-bold text-brand">404</p>
      <h1 className="mt-2 text-lg font-semibold text-slate-900">{t("errors.notFoundTitle")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("errors.notFoundMessage")}</p>
      <div className="mt-4">
        <Link to="/dashboard">
          <Button variant="primary">{t("nav.dashboard")}</Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
