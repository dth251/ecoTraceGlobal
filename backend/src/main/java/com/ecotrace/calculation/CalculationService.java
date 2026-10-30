package com.ecotrace.calculation;

import com.ecotrace.activity.ActivityRepository;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.domain.EmissionRecord;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.emissionfactor.EmissionFactorResolver;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.product.AllocationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Điều phối tính toán phát thải: activity_data → emission_record → product_footprint (mục 8.3). */
@Service
public class CalculationService {

    private final OrganizationService organizationService;
    private final ActivityRepository activities;
    private final EmissionRecordRepository records;
    private final EmissionFactorResolver factors;
    private final List<EmissionCalculator> calculators;
    private final AllocationService allocationService;
    private final String calcVersion;

    public CalculationService(OrganizationService organizationService, ActivityRepository activities,
                              EmissionRecordRepository records, EmissionFactorResolver factors,
                              List<EmissionCalculator> calculators, AllocationService allocationService,
                              @Value("${app.calculation.version:0.1.0}") String calcVersion) {
        this.organizationService = organizationService;
        this.activities = activities;
        this.records = records;
        this.factors = factors;
        this.calculators = calculators;
        this.allocationService = allocationService;
        this.calcVersion = calcVersion;
    }

    /** Tính lại toàn bộ kỳ: xóa bản ghi cũ, tính từng hoạt động, rồi phân bổ cho sản phẩm. */
    @Transactional
    public Map<String, Object> calculatePeriod(UUID periodId) {
        ReportingPeriod period = organizationService.requireOpenPeriod(periodId);
        List<ActivityData> list = activities.findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(
                TenantContext.organizationId(), periodId);
        List<String> skipped = calculate(list, gridRegionOf(period));
        allocationService.recalculate(periodId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("periodId", periodId);
        result.put("calculatedAt", Instant.now());
        result.put("recordsCalculated", list.size() - skipped.size());
        result.put("skipped", skipped);
        return result;
    }

    /**
     * Tính phát thải cho các hoạt động vừa lưu (gọi ngay sau khi nhập tay hoặc nhập chứng từ).
     * Hoạt động không tìm được hệ số sẽ bị bỏ qua và trả về trong danh sách thông báo.
     */
    @Transactional
    public List<String> calculate(List<ActivityData> list, String gridRegion) {
        if (list.isEmpty()) return List.of();
        records.deleteAllByActivityDataIdIn(list.stream().map(ActivityData::getId).toList());
        List<String> skipped = new ArrayList<>();
        for (ActivityData a : list) {
            EmissionCalculator calc = calculators.stream()
                    .filter(c -> c.supports(a.getCategory()))
                    .findFirst()
                    .orElse(null);
            if (calc == null) {
                skipped.add(a.getId() + ": no calculator for " + a.getCategory());
                continue;
            }
            try {
                EmissionCalculator.EmissionResult r = calc.calculate(a, gridRegion, factors);
                records.save(new EmissionRecord(a.getId(), r.emissionFactorId(), r.scope(), r.scope3Category(),
                        r.co2eKg(), r.method(), calcVersion));
            } catch (ApiException e) {
                skipped.add(a.getId() + ": " + e.getMessage());
            }
        }
        return skipped;
    }

    public String gridRegionOf(ReportingPeriod period) {
        return organizationService.requireFacility(period.getFacilityId()).getGridRegion();
    }
}
