package com.ecotrace.activity;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.activity.domain.ActivityData;
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
import java.util.Map;
import java.util.UUID;

@Service
public class ActivityService {

    private final ActivityRepository repository;
    private final OrganizationService organizationService;
    private final UnitConverter units;
    private final AuditService audit;

    public ActivityService(ActivityRepository repository, OrganizationService organizationService, UnitConverter units,
                           AuditService audit) {
        this.repository = repository;
        this.organizationService = organizationService;
        this.units = units;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<ActivityData> list(UUID periodId, ActivityCategory category) {
        UUID orgId = TenantContext.organizationId();
        return category == null
                ? repository.findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(orgId, periodId)
                : repository.findAllByOrganizationIdAndPeriodIdAndCategoryOrderByActivityDateDesc(orgId, periodId, category);
    }

    /**
     * Nhập tay một hoạt động. Không có chứng từ gốc nên khi xét cấp hộ chiếu, bản ghi này bị tính là
     * "không truy được về chứng từ" cho tới khi có bằng chứng.
     */
    @Transactional
    public ActivityData createManual(Map<String, Object> body) {
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
        return a;
    }

    public ActivityData update(UUID id, Map<String, Object> body) {
        throw ApiException.notImplemented("PUT /activities/{id}");
    }
}

