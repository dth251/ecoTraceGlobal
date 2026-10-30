package com.ecotrace.entry;

import com.ecotrace.activity.ActivityRepository;
import com.ecotrace.activity.ActivityService;
import com.ecotrace.activity.ActivityService.ActivityInput;
import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.EmissionRecordRepository;
import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.document.DocumentService;
import com.ecotrace.document.domain.Document;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.validation.ElectricityRules;
import com.ecotrace.validation.FuelRules;
import com.ecotrace.validation.ValidationIssue;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Nhập liệu từ chứng từ: kiểm tra form, chuyển thành activity_data (entry_method = DOCUMENT),
 * tính phát thải và đánh dấu chứng từ đã nhập (mục 7.2–7.4).
 */
@Service
public class DocumentEntryService {

    private final DocumentService documentService;
    private final ActivityService activityService;
    private final ActivityRepository activities;
    private final EmissionRecordRepository records;
    private final OrganizationService organizationService;
    private final ElectricityRules electricityRules;
    private final FuelRules fuelRules;
    private final AuditService audit;

    public DocumentEntryService(DocumentService documentService, ActivityService activityService,
                                ActivityRepository activities, EmissionRecordRepository records,
                                OrganizationService organizationService, ElectricityRules electricityRules,
                                FuelRules fuelRules, AuditService audit) {
        this.documentService = documentService;
        this.activityService = activityService;
        this.activities = activities;
        this.records = records;
        this.organizationService = organizationService;
        this.electricityRules = electricityRules;
        this.fuelRules = fuelRules;
        this.audit = audit;
    }

    /** Kết quả kiểm tra: các dòng hoạt động hợp lệ và danh sách lỗi/cảnh báo. */
    private record Checked(List<ActivityInput> inputs, List<ValidationIssue> issues) {
        boolean hasErrors() {
            return issues.stream().anyMatch(i -> i.level() == ValidationIssue.Level.ERROR);
        }

        boolean hasWarnings() {
            return issues.stream().anyMatch(i -> i.level() == ValidationIssue.Level.WARNING);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getEntry(UUID documentId) {
        Document doc = documentService.require(documentId);
        List<ActivityData> saved = activities.findAllByOrganizationIdAndSourceDocumentId(
                TenantContext.organizationId(), documentId);
        Object data = saved.isEmpty() ? Map.of() : saved.get(0).getMetadata().getOrDefault("entry", Map.of());
        return response(doc, data, List.of(), activityService.toViews(saved));
    }

    @Transactional
    public Map<String, Object> saveEntry(UUID documentId, Map<String, Object> body) {
        Document doc = documentService.require(documentId);
        ReportingPeriod period = organizationService.requireOpenPeriod(doc.getPeriodId());
        Map<String, Object> data = dataOf(body);
        Checked checked = check(doc, data, period);

        if (checked.hasErrors()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "ENTRY_INVALID",
                    "Entry has blocking errors", Map.of("issues", checked.issues()));
        }
        if (checked.hasWarnings() && !Boolean.TRUE.equals(body.get("acknowledgeWarnings"))) {
            throw new ApiException(HttpStatus.CONFLICT, "WARNINGS_NOT_ACKNOWLEDGED",
                    "Entry has warnings that must be acknowledged", Map.of("issues", checked.issues()));
        }

        // Nhập lại chứng từ: thay toàn bộ dòng hoạt động cũ của chứng từ này
        List<ActivityData> old = activities.findAllByOrganizationIdAndSourceDocumentId(
                TenantContext.organizationId(), documentId);
        if (!old.isEmpty()) {
            records.deleteAllByActivityDataIdIn(old.stream().map(ActivityData::getId).toList());
            activities.deleteAll(old);
            activities.flush();
        }

        List<ActivityData> created = new ArrayList<>();
        for (ActivityInput input : checked.inputs()) {
            ActivityData a = activityService.newActivity(period, ActivityData.EntryMethod.DOCUMENT, input);
            a.setSourceDocumentId(documentId);
            Map<String, Object> meta = new HashMap<>(a.getMetadata());
            meta.put("entry", data);
            a.setMetadata(meta);
            created.add(activities.save(a));
        }
        activityService.recalculate(period, created);
        doc.markEntered(TenantContext.userId());
        audit.record(AuditService.UPDATE, "document", documentId, null, Map.of("entry", data));
        return response(doc, data, checked.issues(), activityService.toViews(created));
    }

    @Transactional(readOnly = true)
    public List<ValidationIssue> validateOnly(UUID documentId, Map<String, Object> body) {
        Document doc = documentService.require(documentId);
        ReportingPeriod period = organizationService.requirePeriod(doc.getPeriodId());
        return check(doc, dataOf(body), period).issues();
    }

    @Transactional
    public void reject(UUID documentId, String reason) {
        Document doc = documentService.require(documentId);
        organizationService.requireOpenPeriod(doc.getPeriodId());
        if (reason == null || reason.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "reason is required");
        }
        doc.reject(reason.trim());
        audit.record(AuditService.UPDATE, "document", documentId, null, Map.of("rejectReason", reason.trim()));
    }

    /** Chuyển form theo loại chứng từ thành các dòng hoạt động, kèm lỗi/cảnh báo. */
    private Checked check(Document doc, Map<String, Object> d, ReportingPeriod period) {
        List<ValidationIssue> issues = new ArrayList<>();
        List<Raw> raws = new ArrayList<>();

        switch (doc.getDocType()) {
            case ELECTRICITY_BILL -> {
                LocalDate start = date(d, "startDate", issues);
                LocalDate end = date(d, "endDate", issues);
                BigDecimal kwh = number(d, "totalKwh", issues);
                issues.addAll(electricityRules.validate(start, end, kwh, List.of()));
                if (end != null && kwh != null) {
                    raws.add(new Raw("totalKwh", ActivityCategory.ELECTRICITY, "GRID", kwh, "kWh", end));
                }
            }
            case FUEL_INVOICE -> {
                LocalDate date = date(d, "date", issues);
                BigDecimal qty = number(d, "quantity", issues);
                String fuel = text(d, "fuelType");
                String unit = d.get("unit") != null ? d.get("unit").toString() : "L";
                issues.addAll(fuelRules.validateLine(fuel, qty, unit));
                if (date != null && qty != null && fuel != null) {
                    raws.add(new Raw("quantity", ActivityCategory.STATIONARY_FUEL, fuel, qty, unit, date));
                }
            }
            case MATERIAL_INVOICE -> {
                LocalDate date = date(d, "date", issues);
                BigDecimal kg = number(d, "quantityKg", issues);
                String group = text(d, "materialGroup");
                if (group == null) issues.add(ValidationIssue.error("materialGroup", "REQUIRED", "materialGroup is required"));
                if (date != null && kg != null && group != null) {
                    raws.add(new Raw("quantityKg", ActivityCategory.PURCHASED_MATERIAL, group, kg, "kg", date));
                }
            }
            case BILL_OF_LADING -> {
                LocalDate date = date(d, "date", issues);
                BigDecimal weightKg = number(d, "weightKg", issues);
                BigDecimal distanceKm = number(d, "distanceKm", issues);
                String mode = text(d, "mode");
                if (mode == null) issues.add(ValidationIssue.error("mode", "REQUIRED", "mode is required"));
                if (date != null && weightKg != null && distanceKm != null && mode != null) {
                    // tấn·km = (kg / 1000) × km; đường biển tính cho vận tải hàng xuất (hạ nguồn)
                    BigDecimal tkm = weightKg.divide(new BigDecimal("1000"), 6, RoundingMode.HALF_UP).multiply(distanceKm);
                    ActivityCategory cat = "SEA".equalsIgnoreCase(mode)
                            ? ActivityCategory.DOWNSTREAM_TRANSPORT : ActivityCategory.UPSTREAM_TRANSPORT;
                    raws.add(new Raw("distanceKm", cat, mode, tkm, "tkm", date));
                }
            }
            default -> issues.add(ValidationIssue.error("docType", "UNSUPPORTED_DOC_TYPE",
                    "Document type " + doc.getDocType() + " has no entry form"));
        }

        List<ActivityInput> inputs = new ArrayList<>();
        if (issues.stream().noneMatch(i -> i.level() == ValidationIssue.Level.ERROR)) {
            for (Raw r : raws) {
                try {
                    inputs.add(activityService.validate(r.category(), r.subCategory(), r.quantity(), r.unit(),
                            r.date(), null, period));
                } catch (ApiException e) {
                    issues.add(ValidationIssue.error(r.field(), e.getCode(), e.getMessage()));
                }
            }
        }
        return new Checked(inputs, issues);
    }

    private record Raw(String field, ActivityCategory category, String subCategory, BigDecimal quantity, String unit,
                       LocalDate date) {
    }

    private Map<String, Object> response(Document doc, Object data, List<ValidationIssue> issues, Object activities) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("documentId", doc.getId());
        res.put("docType", doc.getDocType());
        res.put("fileName", doc.getFileName());
        res.put("status", doc.getStatus());
        res.put("data", data);
        res.put("issues", issues);
        res.put("activities", activities);
        return res;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> dataOf(Map<String, Object> body) {
        Object data = body.get("data");
        return data instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
    }

    private static String text(Map<String, Object> d, String field) {
        Object v = d.get(field);
        return v == null || v.toString().isBlank() ? null : v.toString().trim();
    }

    private static BigDecimal number(Map<String, Object> d, String field, List<ValidationIssue> issues) {
        String v = text(d, field);
        if (v == null) {
            issues.add(ValidationIssue.error(field, "REQUIRED", field + " is required"));
            return null;
        }
        try {
            BigDecimal n = new BigDecimal(v);
            if (n.signum() <= 0) {
                issues.add(ValidationIssue.error(field, "NON_POSITIVE", field + " must be > 0"));
                return null;
            }
            return n;
        } catch (NumberFormatException e) {
            issues.add(ValidationIssue.error(field, "NOT_A_NUMBER", field + " must be a number"));
            return null;
        }
    }

    private static LocalDate date(Map<String, Object> d, String field, List<ValidationIssue> issues) {
        String v = text(d, field);
        if (v == null) {
            issues.add(ValidationIssue.error(field, "REQUIRED", field + " is required"));
            return null;
        }
        try {
            return LocalDate.parse(v.substring(0, Math.min(10, v.length())));
        } catch (RuntimeException e) {
            issues.add(ValidationIssue.error(field, "INVALID_DATE", field + " must be YYYY-MM-DD"));
            return null;
        }
    }
}
