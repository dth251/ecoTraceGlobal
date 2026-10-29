package com.ecotrace.activity;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.CalculationService;
import com.ecotrace.calculation.EmissionRecordRepository;
import com.ecotrace.calculation.domain.EmissionRecord;
import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.common.util.UnitConverter;
import com.ecotrace.emissionfactor.EmissionFactorResolver;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.product.AllocationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ActivityService {

    private final ActivityRepository repository;
    private final EmissionRecordRepository records;
    private final OrganizationService organizationService;
    private final CalculationService calculationService;
    private final AllocationService allocationService;
    private final EmissionFactorResolver factors;
    private final UnitConverter unitConverter;
    private final AuditService audit;

    public ActivityService(ActivityRepository repository, EmissionRecordRepository records,
                           OrganizationService organizationService, CalculationService calculationService,
                           AllocationService allocationService, EmissionFactorResolver factors,
                           UnitConverter unitConverter, AuditService audit) {
        this.repository = repository;
        this.records = records;
        this.organizationService = organizationService;
        this.calculationService = calculationService;
        this.allocationService = allocationService;
        this.factors = factors;
        this.unitConverter = unitConverter;
        this.audit = audit;
    }

    /** Hoạt động kèm kết quả phát thải, đúng hình dạng frontend đang dùng. */
    public record ActivityView(UUID id, UUID periodId, LocalDate activityDate, String category, String subType,
                               BigDecimal quantity, String unit, short scope, BigDecimal co2eKg,
                               UUID documentId, String note, String entryMethod) {
    }

    /** Nội dung một hoạt động đã kiểm tra hợp lệ, dùng chung cho nhập tay và nhập chứng từ. */
    public record ActivityInput(ActivityCategory category, String subCategory, BigDecimal quantity, String unit,
                                LocalDate activityDate, String note) {
    }

    @Transactional(readOnly = true)
    public List<ActivityView> list(UUID periodId, ActivityCategory category) {
        UUID orgId = TenantContext.organizationId();
        List<ActivityData> list = category == null
                ? repository.findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(orgId, periodId)
                : repository.findAllByOrganizationIdAndPeriodIdAndCategoryOrderByActivityDateDesc(orgId, periodId, category);
        return toViews(list);
    }

    @Transactional
    public ActivityView createManual(Map<String, Object> body) {
        UUID periodId = uuid(body.get("periodId"), "periodId");
        ReportingPeriod period = organizationService.requireOpenPeriod(periodId);
        ActivityInput input = parse(body, period);

        ActivityData a = newActivity(period, ActivityData.EntryMethod.MANUAL, input);
        a = repository.save(a);
        audit.record(AuditService.CREATE, "activity_data", a.getId(), null, input);
        recalculate(period, List.of(a));
        return toViews(List.of(a)).get(0);
    }

    @Transactional
    public ActivityView update(UUID id, Map<String, Object> body) {
        ActivityData a = repository.findByIdAndOrganizationId(id, TenantContext.organizationId())
                .orElseThrow(() -> ApiException.notFound("activity_data", id));
        ReportingPeriod period = organizationService.requireOpenPeriod(a.getPeriodId());
        ActivityInput input = parse(body, period);
        a.update(input.category(), input.subCategory(), input.quantity(), input.unit(), input.activityDate());
        a.setMetadata(noteMetadata(input.note()));
        a = repository.save(a);
        audit.record(AuditService.UPDATE, "activity_data", a.getId(), null, input);
        recalculate(period, List.of(a));
        return toViews(List.of(a)).get(0);
    }

    /** Tạo activity_data mới (chưa lưu) từ dữ liệu đã kiểm tra. */
    public ActivityData newActivity(ReportingPeriod period, ActivityData.EntryMethod method, ActivityInput input) {
        ActivityData a = new ActivityData(period.getOrganizationId(), period.getId(), period.getFacilityId(), method,
                input.category(), input.subCategory(), input.quantity(), input.unit(), input.activityDate());
        a.setCreatedBy(TenantContext.userId());
        a.setMetadata(noteMetadata(input.note()));
        return a;
    }

    /**
     * Kiểm tra một hoạt động: hạng mục hợp lệ, số lượng dương, đơn vị quy đổi được về đơn vị chuẩn,
     * ngày nằm trong kỳ và có hệ số phát thải phù hợp. Ném 4xx nếu sai.
     */
    public ActivityInput validate(ActivityCategory category, String subCategory, BigDecimal quantity, String unit,
                                  LocalDate date, String note, ReportingPeriod period) {
        if (quantity == null || quantity.signum() <= 0) {
            throw badRequest("quantity", "quantity must be > 0");
        }
        if (date == null) {
            throw badRequest("activityDate", "activityDate is required");
        }
        if (date.isBefore(period.getStartDate()) || date.isAfter(period.getEndDate())) {
            throw badRequest("activityDate", "activityDate must be within the reporting period");
        }
        // Ném UNIT_NOT_SUPPORTED / UNIT_NOT_CONVERTIBLE nếu đơn vị không khớp hạng mục
        unitConverter.convert(BigDecimal.ONE, unit, category.getStandardUnit());
        String sub = subCategory == null || subCategory.isBlank()
                ? (category == ActivityCategory.ELECTRICITY ? "GRID" : null)
                : subCategory.trim().toUpperCase();
        factors.resolve(category, sub, calculationService.gridRegionOf(period), date);
        return new ActivityInput(category, sub, quantity, unit, date, note);
    }

    /** Tính phát thải cho các hoạt động vừa lưu rồi phân bổ lại cho sản phẩm. */
    public void recalculate(ReportingPeriod period, List<ActivityData> list) {
        calculationService.calculate(list, calculationService.gridRegionOf(period));
        allocationService.recalculate(period.getId());
    }

    public List<ActivityView> toViews(List<ActivityData> list) {
        if (list.isEmpty()) return List.of();
        Map<UUID, EmissionRecord> byActivity = records.findAllByActivityDataIdIn(
                        list.stream().map(ActivityData::getId).toList()).stream()
                .collect(Collectors.toMap(EmissionRecord::getActivityDataId, Function.identity(), (x, y) -> y));
        return list.stream().map(a -> {
            EmissionRecord r = byActivity.get(a.getId());
            Object note = a.getMetadata().get("note");
            return new ActivityView(a.getId(), a.getPeriodId(), a.getActivityDate(), a.getCategory().name(),
                    a.getSubCategory(), a.getQuantity(), a.getUnit(), a.getCategory().getScope(),
                    r != null ? r.getCo2eKg() : null, a.getSourceDocumentId(),
                    note != null ? note.toString() : null, a.getEntryMethod().name());
        }).toList();
    }

    private ActivityInput parse(Map<String, Object> body, ReportingPeriod period) {
        ActivityCategory category;
        try {
            category = ActivityCategory.valueOf(String.valueOf(body.get("category")));
        } catch (IllegalArgumentException e) {
            throw badRequest("category", "Unknown category: " + body.get("category"));
        }
        Object sub = body.containsKey("subType") ? body.get("subType") : body.get("subCategory");
        Object note = body.get("note");
        return validate(category, sub != null ? sub.toString() : null, decimal(body.get("quantity")),
                body.get("unit") != null ? body.get("unit").toString() : null,
                date(body.get("activityDate")), note != null ? note.toString() : null, period);
    }

    private static Map<String, Object> noteMetadata(String note) {
        Map<String, Object> m = new HashMap<>();
        if (note != null && !note.isBlank()) m.put("note", note.trim());
        return m;
    }

    static BigDecimal decimal(Object v) {
        if (v == null || v.toString().isBlank()) return null;
        try {
            return new BigDecimal(v.toString());
        } catch (NumberFormatException e) {
            throw badRequest("quantity", "Invalid number: " + v);
        }
    }

    static LocalDate date(Object v) {
        if (v == null || v.toString().isBlank()) return null;
        try {
            return LocalDate.parse(v.toString().substring(0, Math.min(10, v.toString().length())));
        } catch (DateTimeParseException e) {
            throw badRequest("activityDate", "Invalid date: " + v);
        }
    }

    private static UUID uuid(Object v, String field) {
        try {
            return UUID.fromString(String.valueOf(v));
        } catch (IllegalArgumentException e) {
            throw badRequest(field, field + " is required");
        }
    }

    private static ApiException badRequest(String field, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, Map.of("field", field));
    }
}
