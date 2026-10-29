import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { loginSchema, type LoginForm } from "@/lib/validation";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/test/fixtures/sample";
import { useAuthStore } from "@/stores/authStore";
import { useContextStore } from "@/stores/contextStore";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      const res = await authApi.login(values);
      setSession(res);
      const ctx = useContextStore.getState();
      if (!ctx.facilityId) {
        ctx.setFacility("fac-1");
        ctx.setPeriod("per-1");
      }
      const next = searchParams.get("next") || "/dashboard";
      navigate(next, { replace: true });
    } catch {
      setServerError(t("auth.invalidCredentials"));
    }
  };

  return (
    <Card className="w-full max-w-md p-6">
      <h1 className="text-lg font-bold text-slate-900">{t("auth.loginTitle")}</h1>
      <p className="mt-1 text-xs text-slate-500">{t("auth.loginSubtitle")}</p>

      {serverError && (
        <div role="alert" className="mt-3 rounded-md bg-danger-light p-2.5 text-xs text-danger-dark">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
        <Input
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          error={errors.email?.message ? t(`validation.${errors.email.message}`) : undefined}
          {...register("email")}
        />
        <Input
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message ? t(`validation.${errors.password.message}`) : undefined}
          {...register("password")}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          {t("auth.loginButton")}
        </Button>
      </form>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-700">Tài khoản dùng thử (1-Click):</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setValue("email", "admin@ecotrace.vn");
              setValue("password", "Password123!");
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left font-medium hover:border-brand hover:text-brand transition-colors text-[11px]"
          >
            🛡️ <strong>Admin</strong>
            <br />
            <span className="text-[10px] text-slate-400">admin@ecotrace.vn</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setValue("email", "auditor@ecotrace.vn");
              setValue("password", "Password123!");
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left font-medium hover:border-brand hover:text-brand transition-colors text-[11px]"
          >
            🔍 <strong>Kiểm toán viên</strong>
            <br />
            <span className="text-[10px] text-slate-400">auditor@ecotrace.vn</span>
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-600">
        {t("auth.noAccount")}{" "}
        <Link to="/register" className="font-medium text-brand hover:underline">
          {t("auth.registerButton")}
        </Link>
      </p>
    </Card>
  );
}

export default LoginPage;
