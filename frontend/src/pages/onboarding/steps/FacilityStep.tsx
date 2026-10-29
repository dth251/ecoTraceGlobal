import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateFacility } from "@/queries/useFacilities";
import type { Facility } from "@/types/domain";

export interface FacilityStepProps {
  onCompleted: (facility: Facility) => void;
}

export function FacilityStep({ onCompleted }: FacilityStepProps) {
  const { t } = useTranslation();
  const createFacility = useCreateFacility();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("VN");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("validation.required"));
      return;
    }
    setError(null);
    const created = await createFacility.mutateAsync({
      name: name.trim(),
      address: address.trim() || undefined,
      country: country.trim() || "VN",
    });
    onCompleted(created);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label={t("onboarding.facilityName")}
        value={name}
        error={error ?? undefined}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        label={t("onboarding.facilityAddress")}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <Input
        label={t("onboarding.country")}
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" loading={createFacility.isPending}>
          {t("common.next")}
        </Button>
      </div>
    </form>
  );
}
