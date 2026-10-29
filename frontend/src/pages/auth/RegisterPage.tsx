import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { registerSchema, type RegisterForm } from "@/lib/validation";
import { useAuthStore } from "@/stores/authStore";

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      organizationName: "",
      taxCode: "",
      fullName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: RegisterForm) => {
    setServerError(null);
    try {
      const res = await authApi.register({
        organizationName: values.organizationName,
        taxCode: values.taxCode || undefined,
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      });
      setSession(res);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t("errors.UNKNOWN"));
    }
  };

  return (
    <Card className="w-full max-w-md p-6">
      <h1 className="text-lg font-bold text-slate-900">{t("auth.registerTitle")}</h1>
      <p className="mt-1 text-xs text-slate-500">{t("auth.registerSubtitle")}</p>

      {serverError && (
        <div role="alert" className="mt-3 rounded-md bg-danger-light p-2.5 text-xs text-danger-dark">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
        <Input
          label={t("auth.organizationName")}
          error={
            errors.organizationName?.message
              ? t(`validation.${errors.organizationName.message}`)
              : undefined
          }
          {...register("organizationName")}
        />
        <Input
          label={t("auth.taxCode")}
          error={errors.taxCode?.message ? t(`validation.${errors.taxCode.message}`) : undefined}
          {...register("taxCode")}
        />
        <Input
          label={t("auth.fullName")}
          error={errors.fullName?.message ? t(`validation.${errors.fullName.message}`) : undefined}
          {...register("fullName")}
        />
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
          autoComplete="new-password"
          error={errors.password?.message ? t(`validation.${errors.password.message}`) : undefined}
          {...register("password")}
        />

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" {...register("acceptTerms")} className="rounded border-slate-300" />
            <span>{t("auth.acceptTerms")}</span>
          </label>
          {errors.acceptTerms?.message && (
            <p role="alert" className="text-xs text-danger">
              {t(`validation.${errors.acceptTerms.message}`)}
            </p>
          )}
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          {t("auth.registerButton")}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-600">
        {t("auth.hasAccount")}{" "}
        <Link to="/login" className="font-medium text-brand hover:underline">
          {t("auth.loginButton")}
        </Link>
      </p>
    </Card>
  );
}

export default RegisterPage;
