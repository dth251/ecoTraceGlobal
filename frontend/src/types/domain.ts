/**
 * Type tiện dùng cho domain, rút từ schema.d.ts.
 * Khi `npm run gen:api` đã sinh schema.d.ts, có thể thay bằng:
 *   export type Facility = components["schemas"]["FacilityResponse"];
 */

export type Role = "VIEWER" | "EDITOR" | "OWNER" | "SYSTEM_ADMIN";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string;
  organizationName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  organizationName: string;
  taxCode?: string;
  fullName: string;
  email: string;
  password: string;
}

export interface Organization {
  id: string;
  name: string;
  taxCode: string | null;
  country: string;
  plan: string;
}

export interface Facility {
  id: string;
  name: string;
  address: string | null;
  country: string;
  gridRegion: string | null;
}

export interface CreateFacilityRequest {
  name: string;
  address?: string;
  country?: string;
}

export type PeriodStatus = "OPEN" | "LOCKED";

export interface Period {
  id: string;
  facilityId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: PeriodStatus;
}

export interface CreatePeriodRequest {
  facilityId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface Product {
  id: string;
  name: string;
  hsCode: string | null;
  cnCode: string | null;
  unit: string;
}

export interface CreateProductRequest {
  name: string;
  hsCode?: string;
  cnCode?: string;
  unit?: string;
}

export type Scope = 1 | 2 | 3;

export type DocType = "ELECTRICITY_BILL" | "FUEL_INVOICE" | "MATERIAL_INVOICE" | "BILL_OF_LADING" | "OTHER";

export type DocumentStatus = "PENDING_ENTRY" | "ENTERED" | "REJECTED";

export interface DocumentItem {
  id: string;
  periodId: string;
  fileName: string;
  docType: DocType;
  status: DocumentStatus;
  activityCount: number;
  uploadedAt: string;
  enteredBy: string | null;
}

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface DocumentEntry {
  documentId: string;
  docType: DocType;
  data: Record<string, unknown>;
  issues: ValidationIssue[];
}

export type ImportTemplateType = "ELECTRICITY" | "FUEL" | "MATERIAL" | "TRANSPORT" | "PRODUCTION";

export interface ImportRowError {
  row: number;
  column: string;
  value: string | null;
  message: string;
}

export interface ImportBatch {
  id: string;
  periodId: string;
  templateType: ImportTemplateType;
  status: "PREVIEW" | "COMMITTED" | "CANCELLED";
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors?: ImportRowError[];
  createdAt: string;
  createdBy: string;
}

export interface Activity {
  id: string;
  periodId: string;
  activityDate: string;
  category: string;
  subType: string | null;
  quantity: number;
  unit: string;
  scope: Scope;
  co2eKg: number | null;
  documentId: string | null;
  note: string | null;
}

export interface ActivityFilters {
  category?: string;
  scope?: Scope;
  month?: string;
}

export interface EmissionSummary {
  periodId: string;
  totalKg: number;
  byScope: Record<"scope1" | "scope2" | "scope3", number>;
  byMonth: { month: string; scope1: number; scope2: number; scope3: number }[];
  topSources: { category: string; label: string; co2eKg: number }[];
  previousTotalKg: number | null;
  calculatedAt: string | null;
}

export interface ProductFootprint {
  productId: string;
  productName: string;
  directPerUnit: number;
  indirectPerUnit: number;
  precursorPerUnit: number;
  totalPerUnit: number;
  actualDataShare: number;
  allocationMethod: string;
}

export interface Recommendation {
  id: string;
  type: string;
  title: string;
  priority: number;
  reductionKgPerYear: number;
  reductionPercent: number;
  investmentVnd: number | null;
  paybackYears: number | null;
  rationale: string;
  assumptions: Record<string, number | string>;
}

export interface ScenarioRequest {
  periodId: string;
  scenario: string;
  params: Record<string, number>;
}

export interface ScenarioResult {
  baselineKg: number;
  scenarioKg: number;
  reductionKg: number;
}

export type PassportStatus = "VALID" | "REVOKED";

export interface Passport {
  id: string;
  publicCode: string;
  productId: string;
  productName: string;
  periodId: string;
  periodName: string;
  totalPerUnit: number;
  status: PassportStatus;
  verificationLevel: "SELF_DECLARED" | "VERIFIED";
  issuedAt: string;
  revokedAt: string | null;
  hash: string;
}

export interface PublicVerification {
  status: PassportStatus;
  signatureValid: boolean;
  companyName: string;
  productName: string;
  cnCode: string | null;
  periodName: string;
  directPerUnit: number;
  indirectPerUnit: number;
  precursorPerUnit: number;
  totalPerUnit: number;
  actualDataShare: number;
  verificationLevel: "SELF_DECLARED" | "VERIFIED";
  revokedAt: string | null;
  hash: string;
  methodologyUrl: string | null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}
