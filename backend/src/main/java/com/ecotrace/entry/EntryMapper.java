package com.ecotrace.entry;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.document.domain.Document.DocType;
import com.ecotrace.validation.ElectricityRules;
import com.ecotrace.validation.FuelRules;
import com.ecotrace.validation.ValidationIssue;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Chuyển đổi giữa dữ liệu form nhập chứng từ (frontend), bản nháp AI bóc tách và dữ liệu hoạt động.
 * Tên trường form trùng với các form ở frontend (ElectricityBillForm, FuelInvoiceForm, MaterialInvoiceForm, BillOfLadingForm).
 */
@Component
public class EntryMapper {

    /** Một dòng hoạt động sinh ra từ chứng từ, trước khi lưu. */
    public record ActivityDraft(ActivityCategory category, String subCategory, BigDecimal quantity, String unit,
                                LocalDate activityDate) {
    }

    private static final Map<String, String> AI_REVIEW_TO_FORM = Map.of(
            "quantity", "quantity", "unit", "unit", "invoice_date", "date", "distance_km", "distanceKm",
            "weight_kg", "weightKg", "transport_mode", "mode", "material_type", "materialGroup",
            "origin", "origin", "destination", "destination", "factor_code", "fuelType");

    private final ElectricityRules electricityRules;
    private final FuelRules fuelRules;

    public EntryMapper(ElectricityRules electricityRules, FuelRules fuelRules) {
        this.electricityRules = electricityRules;
        this.fuelRules = fuelRules;
    }

    /** Loại chứng từ theo trường doc_type AI trả về; không nhận ra thì null. */
    public static DocType docTypeOf(Map<String, Object> extraction) {
        Object t = extraction == null ? null : extraction.get("doc_type");
        try {
            return t == null ? null : DocType.valueOf(t.toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** Điền sẵn form từ khối `data` của AI. Đây chỉ là gợi ý: người dùng phải đối chiếu và lưu thì mới tính. */
    public Map<String, Object> formFromAi(DocType type, Map<String, Object> extraction) {
        Map<String, Object> d = data(extraction);
        Map<String, Object> f = new LinkedHashMap<>();
        String date = str(d.get("invoice_date"));
        switch (type) {
            case ELECTRICITY_BILL -> {
                f.put("supplierName", str(d.get("supplier")));
                f.put("customerCode", "");
                LocalDate end = parseDate(date);
                f.put("startDate", end != null ? end.withDayOfMonth(1).toString() : null);
                f.put("endDate", end != null ? end.toString() : null);
                f.put("totalKwh", num(d.get("quantity")));
            }
            case FUEL_INVOICE -> {
                f.put("supplier", str(d.get("supplier")));
                f.put("date", date);
                f.put("fuelType", fuelTypeOf(str(d.get("factor_code"))));
                f.put("quantity", num(d.get("quantity")));
                f.put("unit", "L");
            }
            case MATERIAL_INVOICE -> {
                f.put("supplier", str(d.get("supplier")));
                String material = str(d.get("material_type"));
                f.put("materialGroup", material != null ? material : str(d.get("description")));
                f.put("date", date);
                BigDecimal q = num(d.get("quantity"));
                String unit = str(d.get("unit"));
                boolean tonnes = unit != null && unit.trim().toLowerCase(Locale.ROOT).matches("t|tấn|tan|tonne|ton");
                f.put("quantityKg", q != null && tonnes ? q.multiply(BigDecimal.valueOf(1000)) : q);
            }
            case BILL_OF_LADING, OTHER -> {
                f.put("bolNumber", str(d.get("invoice_no")));
                f.put("mode", str(d.get("transport_mode")) != null ? str(d.get("transport_mode")) : "ROAD");
                f.put("origin", str(d.get("origin")));
                f.put("destination", str(d.get("destination")));
                f.put("weightKg", num(d.get("weight_kg")));
                f.put("distanceKm", num(d.get("distance_km")));
                f.put("date", date);
            }
        }
        return f;
    }

    /** Các trường AI chưa chắc (review_fields), đổi sang tên trường form. */
    public List<String> aiReviewFields(Map<String, Object> extraction) {
        Object rf = data(extraction).get("review_fields");
        List<String> out = new ArrayList<>();
        if (rf instanceof List<?> list) {
            for (Object o : list) {
                out.add(AI_REVIEW_TO_FORM.getOrDefault(String.valueOf(o), String.valueOf(o)));
            }
        }
        return out;
    }

    /** Kiểm tra form trước khi lưu. Lỗi (ERROR) chặn lưu; cảnh báo (WARNING) phải được người dùng xác nhận. */
    public List<ValidationIssue> validate(DocType type, Map<String, Object> f, LocalDate periodStart, LocalDate periodEnd) {
        List<ValidationIssue> issues = new ArrayList<>();
        switch (type) {
            case ELECTRICITY_BILL -> {
                LocalDate start = requireDate(f, "startDate", issues);
                LocalDate end = requireDate(f, "endDate", issues);
                issues.addAll(electricityRules.validate(start, end, num(f.get("totalKwh")), null));
                checkInPeriod("endDate", end, periodStart, periodEnd, issues);
                if (start != null && start.isBefore(periodStart)) {
                    issues.add(ValidationIssue.warning("startDate", "STARTS_BEFORE_PERIOD",
                            "Kỳ hóa đơn bắt đầu trước kỳ báo cáo, toàn bộ lượng điện được tính vào kỳ này"));
                }
            }
            case FUEL_INVOICE -> {
                issues.addAll(fuelRules.validateLine(str(f.get("fuelType")), num(f.get("quantity")), str(f.get("unit"))));
                checkInPeriod("date", requireDate(f, "date", issues), periodStart, periodEnd, issues);
            }
            case MATERIAL_INVOICE -> {
                if (blank(f.get("materialGroup"))) {
                    issues.add(ValidationIssue.error("materialGroup", "REQUIRED", "Cần ghi loại nguyên liệu"));
                } else if ("GENERIC".equals(materialOf(str(f.get("materialGroup"))))) {
                    issues.add(ValidationIssue.warning("materialGroup", "DEFAULT_FACTOR",
                            "Không nhận ra loại nguyên liệu, sẽ dùng hệ số mặc định (không tính là dữ liệu thực tế)"));
                }
                positive(f, "quantityKg", issues);
                checkInPeriod("date", requireDate(f, "date", issues), periodStart, periodEnd, issues);
            }
            case BILL_OF_LADING -> {
                positive(f, "weightKg", issues);
                positive(f, "distanceKm", issues);
                if (blank(f.get("mode"))) {
                    issues.add(ValidationIssue.error("mode", "REQUIRED", "Cần chọn phương thức vận tải"));
                }
                checkInPeriod("date", requireDate(f, "date", issues), periodStart, periodEnd, issues);
            }
            case OTHER -> issues.add(ValidationIssue.error("docType", "UNSUPPORTED_DOC_TYPE",
                    "Chọn loại chứng từ (điện, nhiên liệu, nguyên liệu, vận đơn) trước khi lưu"));
        }
        return issues;
    }

    /** Đổi form đã hợp lệ thành dữ liệu hoạt động theo đơn vị chuẩn của từng hạng mục. */
    public ActivityDraft toActivity(DocType type, Map<String, Object> f) {
        return switch (type) {
            case ELECTRICITY_BILL -> new ActivityDraft(ActivityCategory.ELECTRICITY, "GRID",
                    num(f.get("totalKwh")), "kWh", parseDate(str(f.get("endDate"))));
            case FUEL_INVOICE -> {
                String fuel = str(f.get("fuelType")).toUpperCase(Locale.ROOT);
                String unit = str(f.get("unit"));
                // LPG và than bán theo kg; các nhiên liệu lỏng theo lít
                String u = unit == null || unit.equalsIgnoreCase("L") ? "litre" : unit;
                yield new ActivityDraft(ActivityCategory.STATIONARY_FUEL, fuel, num(f.get("quantity")), u,
                        parseDate(str(f.get("date"))));
            }
            case MATERIAL_INVOICE -> new ActivityDraft(ActivityCategory.PURCHASED_MATERIAL,
                    materialOf(str(f.get("materialGroup"))), num(f.get("quantityKg")), "kg", parseDate(str(f.get("date"))));
            case BILL_OF_LADING -> new ActivityDraft(ActivityCategory.UPSTREAM_TRANSPORT,
                    str(f.get("mode")).toUpperCase(Locale.ROOT),
                    num(f.get("weightKg")).divide(BigDecimal.valueOf(1000), MathContext.DECIMAL64).multiply(num(f.get("distanceKm"))),
                    "tkm", parseDate(str(f.get("date"))));
            case OTHER -> throw new IllegalArgumentException("OTHER document cannot be entered");
        };
    }

    /** Loại nguyên liệu theo từ khóa; không nhận ra thì GENERIC (hệ số mặc định). */
    public static String materialOf(String text) {
        String t = text == null ? "" : text.toLowerCase(Locale.ROOT);
        if (t.matches(".*(thép|thep|steel|sắt|iron|mat_steel).*")) return "STEEL";
        if (t.matches(".*(nhựa|nhua|plastic|pp|pe|pet|hạt nhựa|mat_plastic).*")) return "PLASTIC";
        if (t.matches(".*(giấy|giay|carton|paper|bìa|mat_paper).*")) return "PAPER";
        if (t.matches(".*(bông|bong|cotton|sợi|mat_cotton).*")) return "COTTON";
        return "GENERIC";
    }

    private static String fuelTypeOf(String factorCode) {
        if (factorCode == null || !factorCode.startsWith("FUEL_")) return null;
        return factorCode.substring("FUEL_".length());
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> data(Map<String, Object> extraction) {
        Object d = extraction == null ? null : extraction.get("data");
        return d instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
    }

    private static void checkInPeriod(String field, LocalDate date, LocalDate start, LocalDate end, List<ValidationIssue> issues) {
        if (date != null && (date.isBefore(start) || date.isAfter(end))) {
            issues.add(ValidationIssue.error(field, "OUTSIDE_PERIOD",
                    "Ngày " + date + " nằm ngoài kỳ báo cáo " + start + " → " + end));
        }
    }

    private static LocalDate requireDate(Map<String, Object> f, String field, List<ValidationIssue> issues) {
        LocalDate d = parseDate(str(f.get(field)));
        if (d == null) {
            issues.add(ValidationIssue.error(field, "REQUIRED_DATE", "Cần ngày hợp lệ (yyyy-MM-dd)"));
        }
        return d;
    }

    private static void positive(Map<String, Object> f, String field, List<ValidationIssue> issues) {
        BigDecimal v = num(f.get(field));
        if (v == null || v.signum() <= 0) {
            issues.add(ValidationIssue.error(field, "NON_POSITIVE", field + " phải lớn hơn 0"));
        }
    }

    static LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return LocalDate.parse(s.length() > 10 ? s.substring(0, 10) : s);
        } catch (DateTimeParseException e) {
            String[] p = s.split("[/.-]");
            if (p.length == 3 && p[2].length() == 4) {
                try {
                    return LocalDate.of(Integer.parseInt(p[2]), Integer.parseInt(p[1]), Integer.parseInt(p[0]));
                } catch (RuntimeException ignored) {
                    return null;
                }
            }
            return null;
        }
    }

    static BigDecimal num(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return new BigDecimal(n.toString());
        try {
            String s = v.toString().trim();
            return s.isEmpty() ? null : new BigDecimal(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    static String str(Object v) {
        return v == null || v.toString().isBlank() ? null : v.toString().trim();
    }

    private static boolean blank(Object v) {
        return str(v) == null;
    }
}
