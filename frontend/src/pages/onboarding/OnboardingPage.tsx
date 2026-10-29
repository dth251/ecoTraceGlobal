import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { FacilityStep } from "@/pages/onboarding/steps/FacilityStep";
import { PeriodStep } from "@/pages/onboarding/steps/PeriodStep";
import { ProductStep } from "@/pages/onboarding/steps/ProductStep";
import { useContextStore } from "@/stores/contextStore";

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setFacility, setPeriod } = useContextStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [createdFacilityId, setCreatedFacilityId] = useState<string>("");

  return (
    <div className="mx-auto max-w-2xl py-6">
      <Card
        title={t("onboarding.title")}
        description={
          step === 1
            ? t("onboarding.step1Title")
            : step === 2
              ? t("onboarding.step2Title")
              : t("onboarding.step3Title")
        }
      >
        <div className="mb-4 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-brand" : "bg-slate-200"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <FacilityStep
            onCompleted={(facility) => {
              setCreatedFacilityId(facility.id);
              setFacility(facility.id);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <ProductStep onBack={() => setStep(1)} onCompleted={() => setStep(3)} />
        )}

        {step === 3 && (
          <PeriodStep
            facilityId={createdFacilityId}
            onBack={() => setStep(2)}
            onCompleted={(period) => {
              setPeriod(period.id);
              navigate("/documents", { replace: true });
            }}
          />
        )}
      </Card>
    </div>
  );
}

export default OnboardingPage;
