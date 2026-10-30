import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { loginSchema, type LoginForm } from "@/lib/validation";
import { useAuthStore } from "@/stores/authStore";
import { useContextStore } from "@/stores/contextStore";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const resetContext = useContextStore((s) => s.reset);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      const res = await authApi.login(values);
      setSession(res);
      // Nhà máy và kỳ báo cáo sẽ được chọn lại từ dữ liệu thật của tổ chức
      resetContext();
      navigate(searchParams.get("next") || "/dashboard", { replace: true });
    } catch (err) {
      const unreachable = err instanceof ApiError && (err.status === 0 || err.status >= 500);
      setServerError(unreachable ? t("errors.SERVER_UNAVAILABLE") : t("auth.invalidCredentials"));
    }
  };

  return (
    <Card className="w-full rounded-[28px] p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold text-ink">{t("auth.loginTitle")}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t("auth.loginSubtitle")}</p>

      {serverError && (
        <div role="alert" className="mt-4 rounded-xl bg-danger-light p-3 text-sm text-danger-dark">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
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

      <p className="mt-6 text-center text-sm text-slate-600">
        {t("auth.noAccount")}{" "}
        <Link to="/register" className="font-bold text-brand-700 underline-offset-4 hover:underline">
          {t("auth.registerButton")}
        </Link>
      </p>
    </Card>
  );
}

export default LoginPage;
