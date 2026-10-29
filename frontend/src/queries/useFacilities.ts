import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { facilitiesApi } from "@/api/facilities";
import { keys } from "@/queries/keys";
import type { CreateFacilityRequest } from "@/types/domain";

export function useFacilities(enabled = true) {
  return useQuery({ queryKey: keys.facilities(), queryFn: facilitiesApi.list, enabled });
}

export function useCreateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFacilityRequest) => facilitiesApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.facilities() }),
  });
}
