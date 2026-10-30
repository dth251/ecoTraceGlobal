package com.ecotrace.activity;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.CalculationService;
import com.ecotrace.calculation.EmissionRecordRepository;
import com.ecotrace.calculation.domain.EmissionRecord;
import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.util.UnitConverter;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.service.OrganizationService;
import org.springframework.http.HttpStatus;
import com.ecotrace.common.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.UUID;

@Service
public class ActivityService {

    private final ActivityRepository repository;
    private final OrganizationService organizationService;
    private final UnitConverter units;
    private final AuditService audit;
    private final EmissionRecordRepository records;
    private final CalculationService calculation;

    public ActivityService(ActivityRepository repository, OrganizationService organizationService, UnitConverter units,
                           AuditService audit, EmissionRecordRepository records, CalculationService calculation) {
        this.records = records;
        this.calculation = calculation;
        this.repository = repository;
        this.organizationService = organizationService;
        this.units = units;
        this.audit = audit;
    }

    /** Hoạt động kèm kết quả phát thải, đúng dạng Activity ở frontend. co2eKg null = chưa tính được. */
    public record ActivityView(UUID id, UUID periodId, LocalDate activityDate, String category, String subType,
                               BigDecimal quantity, String unit, short scope, BigDecimal co2eKg,
                               UUID documentId, String note, String entryMethod) {
    }

    @Transactional(readOnly = true)
    public List<ActivityView> list(UUID periodId, ActivityCategory category) {
        organizationService.requirePeriod(periodId);
        UUID orgId = TenantContext.organizationId();
        List<ActivityData> list = category == null
                ? repository.findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(orgId, periodId)
                : repository.findAllByOrganizationIdAndPeriodIdAndCategoryOrderByActivityDateDesc(orgId, periodId, category);
        return toViews(list);
    }

    private List<ActivityView> toViews(List<ActivityData> list) {
        Map<UUID, EmissionRecord> byActivity = list.isEmpty() ? Map.of()
                : records.findAllByActivityDataIdIn(list.stream().map(ActivityData::getId).toList()).stream()
                        .collect(Collectors.toMap(EmissionRecord::getActivityDataId, Function.identity(), (x, y) -> x));
        return list.stream().map(a -> {
            EmissionRecord r = byActivity.get(a.getId());
            Object note = a.getMetadata() != null ? a.getMetadata().get("note") : null;
            return new ActivityView(a.getId(), a.getPeriodId(), a.getActivityDate(), a.getCategory().name(),
                    a.getSubCategory(), a.getQuantity(), a.getUnit(), r != null ? r.getScope() : a.getCategory().getScope(),
                    r != null ? r.getCo2eKg() : null, a.getSourceDocumentId(), note == null ? null : note.toString(),
                    a.getEntryMethod().name());
        }).toList();
    }

    /**
     * Nhập tay một hoạt động. Không có chứng từ gốc nên khi xét cấp hộ chiếu, bản ghi này bị tính là
     * "không truy được về chứng từ" cho tới khi có bằng chứng.
     */
    @Transactional
    public ActivityView createManual(Map<String, Object> body) {
        UUID periodId = UUID.fromString(String.valueOf(body.get("periodId")));
        ReportingPeriod period = organizationService.requireOpenPeriod(periodId);
        ActivityCategory category;
        try {
            category = ActivityCategory.valueOf(String.valueOf(body.get("category")));
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CATEGORY", "Unknown activity category");
        }
        BigDecimal quantity;
        LocalDate date;
        try {
            quantity = new BigDecimal(String.valueOf(body.get("quantity")));
            date = LocalDate.parse(String.valueOf(body.get("activityDate")));
        } catch (RuntimeException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ACTIVITY", "quantity and activityDate are required");
        }
        if (quantity.signum() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NON_POSITIVE", "quantity must be > 0");
        }
        if (date.isBefore(period.getStartDate()) || date.isAfter(period.getEndDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OUTSIDE_PERIOD", "activityDate is outside the reporting period");
        }
        String unit = String.valueOf(body.get("unit"));
        if (units.dimensionOf(unit) != units.dimensionOf(category.getStandardUnit())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNIT_NOT_CONVERTIBLE",
                    unit + " is not valid for " + category + " (" + category.getStandardUnit() + ")");
        }
        Object sub = body.get("subType") != null ? body.get("subType") : body.get("subCategory");
        String subCategory = sub == null || String.valueOf(sub).isBlank() ? null : String.valueOf(sub).toUpperCase();
        Object note = body.get("note");
        ActivityData a = repository.save(new ActivityData(TenantContext.organizationId(), periodId, period.getFacilityId(),
                ActivityData.EntryMethod.MANUAL, category, subCategory, quantity, unit, date)
                .withEvidence(null, TenantContext.userId(), note == null ? Map.of() : Map.of("note", String.valueOf(note))));
        audit.record(AuditService.CREATE, "activity_data", a.getId(), null, Map.of("category", category.name()));
        calculation.recalculate(period, List.of(a));
        return toViews(List.of(a)).get(0);
    }

    public ActivityData update(UUID id, Map<String, Object> body) {
        throw ApiException.notImplemented("PUT /activities/{id}");
    }
}

