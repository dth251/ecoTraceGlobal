import type {
  Activity,
  AuthResponse,
  DocumentItem,
  EmissionSummary,
  Facility,
  ImportBatch,
  Organization,
  Passport,
  Period,
  Product,
  ProductFootprint,
  PublicVerification,
  Recommendation,
} from "@/types/domain";

export const DEMO_EMAIL = "lan@abc-mech.vn";
export const DEMO_PASSWORD = "DemoPassword123";

export const sampleAuthResponse: AuthResponse = {
  accessToken: "demo-access-token",
  refreshToken: "demo-refresh-token",
  expiresIn: 1800,
  user: {
    id: "usr-1",
    email: DEMO_EMAIL,
    fullName: "Chị Lan (QA & Xuất khẩu)",
    role: "OWNER",
    organizationId: "org-1",
    organizationName: "ABC Mechanical JSC",
  },
};

export const sampleOrganization: Organization = {
  id: "org-1",
  name: "ABC Mechanical JSC",
  taxCode: "0101234567",
  country: "VN",
  plan: "TRIAL",
};

export const sampleFacilities: Facility[] = [
  {
    id: "fac-1",
    name: "Nhà máy Cơ khí Bình Dương",
    address: "KCN VSIP 1, Bình Dương",
    country: "VN",
    gridRegion: "VN_NATIONAL",
  },
];

export const samplePeriods: Period[] = [
  {
    id: "per-1",
    facilityId: "fac-1",
    name: "Q3/2026",
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    status: "OPEN",
  },
];

export const sampleProducts: Product[] = [
  {
    id: "prd-1",
    name: "Bu lông lục giác M12",
    hsCode: "731815",
    cnCode: "7318 15 95",
    unit: "t",
  },
];

export const sampleDocuments: DocumentItem[] = [
  {
    id: "doc-1",
    periodId: "per-1",
    fileName: "hoadon_dien_T08_2026.pdf",
    docType: "ELECTRICITY_BILL",
    status: "PENDING_ENTRY",
    activityCount: 0,
    uploadedAt: "2026-09-05T08:30:00Z",
    enteredBy: null,
  },
  {
    id: "doc-2",
    periodId: "per-1",
    fileName: "hoadon_dau_DO_T08_2026.pdf",
    docType: "FUEL_INVOICE",
    status: "ENTERED",
    activityCount: 1,
    uploadedAt: "2026-09-04T09:15:00Z",
    enteredBy: "Chị Lan",
  },
];

export const sampleImports: ImportBatch[] = [
  {
    id: "imp-1",
    periodId: "per-1",
    templateType: "MATERIAL",
    status: "COMMITTED",
    totalRows: 200,
    validRows: 196,
    errorRows: 4,
    createdAt: "2026-09-10T10:00:00Z",
    createdBy: "Chị Lan",
  },
];

export const sampleActivities: Activity[] = [
  {
    id: "act-1",
    periodId: "per-1",
    activityDate: "2026-08-31",
    category: "ELECTRICITY",
    subType: "GRID",
    quantity: 120000,
    unit: "kWh",
    scope: 2,
    co2eKg: 81600,
    documentId: "doc-1",
    note: "Điện lưới tháng 08/2026",
  },
  {
    id: "act-2",
    periodId: "per-1",
    activityDate: "2026-08-20",
    category: "PURCHASED_MATERIAL",
    subType: "STEEL",
    quantity: 22315.79,
    unit: "kg",
    scope: 3,
    co2eKg: 42400,
    documentId: null,
    note: "Thép cuộn cán nóng",
  },
  {
    id: "act-3",
    periodId: "per-1",
    activityDate: "2026-08-15",
    category: "STATIONARY_FUEL",
    subType: "DIESEL",
    quantity: 6902.98,
    unit: "litre",
    scope: 1,
    co2eKg: 18500,
    documentId: "doc-2",
    note: "Dầu DO đốt lò nhiệt luyện",
  },
];

export const sampleFootprints: ProductFootprint[] = [
  {
    productId: "prd-1",
    productName: "Bu lông lục giác M12",
    directPerUnit: 0.21,
    indirectPerUnit: 0.34,
    precursorPerUnit: 1.62,
    totalPerUnit: 2.17,
    actualDataShare: 0.72,
    allocationMethod: "MASS",
  },
];

export const sampleRecommendations: Recommendation[] = [
  {
    id: "rec-1",
    type: "SOLAR_ROOFTOP",
    title: "Lắp điện mặt trời áp mái 300 kWp",
    priority: 1,
    reductionKgPerYear: 142000,
    reductionPercent: 18,
    investmentVnd: 4500000000,
    paybackYears: 5.2,
    rationale: "Điện chiếm 57% tổng phát thải của nhà máy.",
    assumptions: { kwp: 300, yieldKwhPerKwp: 1350 },
  },
];

export const samplePassports: Passport[] = [
  {
    id: "pas-1",
    publicCode: "ET-7KQ2-9XMA",
    productId: "prd-1",
    productName: "Bu lông lục giác M12",
    periodId: "per-1",
    periodName: "Q3/2026",
    totalPerUnit: 2.17,
    status: "VALID",
    verificationLevel: "SELF_DECLARED",
    issuedAt: "2026-10-02T09:00:00Z",
    revokedAt: null,
    hash: "3fa9d1b40e7c82a5d9103c44b8f1209ea7731c600b2a9914e87039f41bc1c21e",
  },
];

export const sampleVerification: PublicVerification = {
  status: "VALID",
  signatureValid: true,
  companyName: "ABC Mechanical JSC",
  productName: "Hex bolt M12",
  cnCode: "7318 15 95",
  periodName: "Q3/2026",
  directPerUnit: 0.21,
  indirectPerUnit: 0.34,
  precursorPerUnit: 1.62,
  totalPerUnit: 2.17,
  actualDataShare: 0.72,
  verificationLevel: "SELF_DECLARED",
  revokedAt: null,
  hash: "3fa9d1b40e7c82a5d9103c44b8f1209ea7731c600b2a9914e87039f41bc1c21e",
  methodologyUrl: null,
};

export const sampleSummary: EmissionSummary = {
  periodId: "per-1",
  totalKg: 142500,
  byScope: { scope1: 18500, scope2: 81600, scope3: 42400 },
  byMonth: [
    { month: "2026-07", scope1: 6000, scope2: 27000, scope3: 14000 },
    { month: "2026-08", scope1: 6200, scope2: 27600, scope3: 14200 },
    { month: "2026-09", scope1: 6300, scope2: 27000, scope3: 14200 },
  ],
  topSources: [
    { category: "ELECTRICITY", label: "Điện mua vào", co2eKg: 81600 },
    { category: "MATERIAL", label: "Thép cuộn", co2eKg: 42400 },
    { category: "STATIONARY_FUEL", label: "Dầu DO", co2eKg: 18500 },
  ],
  previousTotalKg: 150000,
  calculatedAt: "2026-10-01T08:00:00Z",
};
