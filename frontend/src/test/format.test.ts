import { describe, expect, it } from "vitest";
import { formatCo2e, formatDate, formatNumber, parseLocaleNumber } from "@/lib/format";
import { hasRole } from "@/hooks/usePermission";
import { unitLabel } from "@/lib/units";
import { loginSchema, registerSchema } from "@/lib/validation";

describe("format utilities", () => {
  it("formats numbers and CO2e according to threshold", () => {
    expect(formatCo2e(500, "en")).toBe("500 kgCO₂e");
    expect(formatCo2e(12500, "en")).toBe("12.5 tCO₂e");
    expect(formatNumber(120000.5, "en")).toBe("120,000.5");
  });

  it("parses Vietnamese and English locale numbers", () => {
    expect(parseLocaleNumber("120.000,5")).toBe(120000.5);
    expect(parseLocaleNumber("120,000.5")).toBe(120000.5);
    expect(parseLocaleNumber("1,5")).toBe(1.5);
    expect(parseLocaleNumber("")).toBeNull();
  });

  it("formats ISO dates for vi and en", () => {
    expect(formatDate("2026-07-15", "vi")).toBe("15/07/2026");
    expect(formatDate("2026-07-15", "en")).toBe("15 Jul 2026");
  });
});

describe("units and permissions", () => {
  it("resolves unit labels", () => {
    expect(unitLabel("t", "vi")).toBe("tấn");
    expect(unitLabel("t", "en")).toBe("tonne");
  });

  it("checks role hierarchy", () => {
    expect(hasRole("OWNER", "EDITOR")).toBe(true);
    expect(hasRole("VIEWER", "EDITOR")).toBe(false);
  });
});

describe("Zod validation schemas", () => {
  it("validates login and register payloads", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "secret" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "bad", password: "" }).success).toBe(false);

    expect(
      registerSchema.safeParse({
        organizationName: "ABC Corp",
        taxCode: "0123456789",
        fullName: "Nguyen Van A",
        email: "admin@abc.vn",
        password: "Password123",
        acceptTerms: true,
      }).success,
    ).toBe(true);
  });
});
