// Query key tập trung (mục 20.4)
export const keys = {
  organization: () => ["organization"] as const,
  facilities: () => ["facilities"] as const,
  periods: (facilityId: string | null) => ["periods", facilityId] as const,
  products: () => ["products"] as const,
  documents: (periodId: string) => ["documents", periodId] as const,
  entry: (docId: string) => ["entry", docId] as const,
  imports: (periodId: string) => ["imports", periodId] as const,
  summary: (periodId: string) => ["summary", periodId] as const,
  activities: (periodId: string, filters: object) => ["activities", periodId, filters] as const,
  footprints: (periodId: string) => ["footprints", periodId] as const,
  recommendations: (periodId: string) => ["recommendations", periodId] as const,
  passports: (periodId: string) => ["passports", periodId] as const,
  verify: (code: string) => ["verify", code] as const,
};
