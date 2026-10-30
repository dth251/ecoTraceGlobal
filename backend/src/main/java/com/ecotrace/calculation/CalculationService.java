package com.ecotrace.calculation;

import com.ecotrace.activity.ActivityRepository;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.domain.EmissionRecord;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.emissionfactor.EmissionFactorResolver;
import com.ecotrace.organization.domain.Facility;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.repository.FacilityRepository;
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

/** Điều phối tính toán phát thải cho một kỳ báo cáo (Sprint 3). */
@Service
public class CalculationService {

    private final OrganizationService organizationService;
    private final ActivityRepository activities;
    private final EmissionRecordRepository records;
    private final FacilityRepository facilities;
    private final EmissionFactorResolver factors;
    private final List<EmissionCalculator> calculators;
    private final AllocationService allocation;
    private final String calcVersion;

    public CalculationService(OrganizationService organizationService, ActivityRepository activities,
                              EmissionRecordRepository records, FacilityRepository facilities,
                              EmissionFactorResolver factors, List<EmissionCalculator> calculators,
                              AllocationService allocation, @Value("${app.calculation.version:0.1.0}") String calcVersion) {
        this.organizationService = organizationService;
        this.activities = activities;
        this.records = records;
        this.facilities = facilities;
        this.factors = factors;
        this.calculators = calculators;
        this.allocation = allocation;
        this.calcVersion = calcVersion;
    }

    /**
     * Tính lại toàn bộ kỳ: xóa bản ghi phát thải cũ, tính từng hoạt động theo hệ số hiệu lực tại ngày hoạt động.
     * Hoạt động không tìm được hệ số hoặc sai đơn vị không bị bỏ qua im lặng: trả về trong danh sách lỗi
     * và được tính là "chưa có hệ số" khi xét cấp hộ chiếu. Xong thì phân bổ lại cho sản phẩm nếu đã có sản lượng.
     */
    @Transactional
    public Map<String, Object> calculatePeriod(UUID periodId) {
        ReportingPeriod period = organizationService.requireOpenPeriod(periodId);
        List<ActivityData> list = activities.findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(
                TenantContext.organizationId(), periodId);
        List<Map<String, Object>> failures = recalculate(period, list);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("periodId", periodId);
        out.put("calculatedAt", Instant.now());
        out.put("recordsCalculated", list.size() - failures.size());
        out.put("activities", list.size());
        out.put("failures", failures);
        // Dạng rút gọn giao diện dùng: mô tả các hoạt động chưa tính được
        out.put("skipped", failures.stream().map(f -> f.get("category") + (f.get("subCategory") != null
                ? " · " + f.get("subCategory") : "") + ": " + f.get("message")).toList());
        return out;
    }

    /**
     * Tính lại các hoạt động cho trước (xóa bản ghi cũ của chúng trước), rồi phân bổ lại cho sản phẩm.
     * Dùng cho cả kỳ (nút "Tính lại") và cho từng hoạt động vừa lưu (nhập chứng từ, nhập tay).
     *
     * @return các hoạt động không tính được kèm lý do
     */
    @Transactional
    public List<Map<String, Object>> recalculate(ReportingPeriod period, List<ActivityData> list) {
        String region = regionOf(period);
        if (!list.isEmpty()) {
            records.deleteAllForActivities(list.stream().map(ActivityData::getId).toList());
        }
        List<Map<String, Object>> failures = new ArrayList<>();
        for (ActivityData a : list) {
            EmissionCalculator calc = calculators.stream().filter(c -> c.supports(a.getCategory())).findFirst().orElse(null);
            try {
                if (calc == null) {
                    throw new ApiException(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY,
                            "NO_CALCULATOR", "No calculator for " + a.getCategory());
                }
                EmissionCalculator.EmissionResult r = calc.calculate(a, region, factors);
                records.save(new EmissionRecord(a.getId(), r.emissionFactorId(), r.scope(), r.scope3Category(),
                        r.co2eKg(), r.method(), calcVersion));
            } catch (ApiException e) {
                Map<String, Object> f = new LinkedHashMap<>();
                f.put("activityId", a.getId());
                f.put("category", a.getCategory());
                f.put("subCategory", a.getSubCategory());
                f.put("code", e.getCode());
                f.put("message", e.getMessage());
                failures.add(f);
            }
        }
        allocation.recompute(period);
        return failures;
    }

    private String regionOf(ReportingPeriod period) {
        Facility facility = facilities.findById(period.getFacilityId()).orElse(null);
        if (facility == null) return "GLOBAL";
        if (facility.getGridRegion() != null) return facility.getGridRegion();
        return facility.getCountry() != null ? facility.getCountry() : "GLOBAL";
    }
}
