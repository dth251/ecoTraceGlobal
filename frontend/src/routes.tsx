import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireRole } from "@/components/auth/RequireRole";
import { AppShell } from "@/components/layout/AppShell";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Skeleton } from "@/components/ui/Skeleton";

const LandingPage = lazy(() => import("@/pages/landing/LandingPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const PublicVerifyPage = lazy(() => import("@/pages/verify/PublicVerifyPage"));
const OnboardingPage = lazy(() => import("@/pages/onboarding/OnboardingPage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const DocumentsPage = lazy(() => import("@/pages/documents/DocumentsPage"));
const DocumentEntryPage = lazy(() => import("@/pages/documents/DocumentEntryPage"));
const ImportsPage = lazy(() => import("@/pages/imports/ImportsPage"));
const ActivitiesPage = lazy(() => import("@/pages/activities/ActivitiesPage"));
const ProductsPage = lazy(() => import("@/pages/products/ProductsPage"));
const OptimizerPage = lazy(() => import("@/pages/optimizer/OptimizerPage"));
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"));
const PassportsPage = lazy(() => import("@/pages/passports/PassportsPage"));
const AiAssistantPage = lazy(() => import("@/pages/ai/AiAssistantPage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const NotFoundPage = lazy(() => import("@/pages/errors/NotFoundPage"));

export function AppRoutes() {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-48" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="/verify/:code" element={<PublicVerifyPage />} />
        </Route>

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route
            path="/onboarding"
            element={
              <RequireRole min="OWNER">
                <OnboardingPage />
              </RequireRole>
            }
          />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route
            path="/documents/:id/entry"
            element={
              <RequireRole min="EDITOR">
                <DocumentEntryPage />
              </RequireRole>
            }
          />
          <Route
            path="/imports"
            element={
              <RequireRole min="EDITOR">
                <ImportsPage />
              </RequireRole>
            }
          />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/optimizer" element={<OptimizerPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/passports" element={<PassportsPage />} />
          <Route path="/ai-assistant" element={<AiAssistantPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
