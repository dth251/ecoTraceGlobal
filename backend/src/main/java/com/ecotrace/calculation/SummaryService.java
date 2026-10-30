package com.ecotrace.calculation;

import com.ecotrace.activity.ActivityRepository;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.domain.EmissionRecord;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.organization.service.OrganizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Tổng hợp phát thải theo scope, tháng, nguồn cho Dashboard và bộ quy tắc đề xuất (Sprint 4). */
@Service
public class SummaryService {

    private final OrganizationService organizationService;
    private final ActivityRepository activities;
    private final EmissionRecordRepository records;

    public SummaryService(OrganizationService organizationService, ActivityRepository activities,
                          EmissionRecordRepository records) {
        this.organizationService = organizationService;
        this.activities = activities;
        this.records = records;
    }

    public record PeriodSummary(
            UUID periodId,
            BigDecimal totalCo2eKg,
            BigDecimal scope1Co2eKg,
            BigDecimal scope2Co2eKg,
            BigDecimal scope3Co2eKg,
            List<MonthlyPoint> byMonth,
            List<SourceItem> topSources) {
    }

    public record MonthlyPoint(String month, BigDecimal scope1Kg, BigDecimal scope2Kg, BigDecimal scope3Kg) {
    }

    public record SourceItem(String category, String subCategory, short scope, BigDecimal co2eKg) {
    }

    @Transactional(readOnly = true)
    public PeriodSummary getSummary(UUID periodId) {
        organizationService.requirePeriod(periodId);
        return compute(TenantContext.organizationId(), periodId);
    }

    /** Tổng hợp từ bản ghi phát thải đã tính; không kiểm tra tenant (gọi nội bộ khi đã biết tổ chức). */
    @Transactional(readOnly = true)
    public PeriodSummary compute(UUID organizationId, UUID periodId) {
        Map<UUID, ActivityData> acts = activities
                .findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(organizationId, periodId).stream()
                .collect(Collectors.toMap(ActivityData::getId, Function.identity()));
        List<EmissionRecord> recs = acts.isEmpty() ? List.of() : records.findAllByActivityDataIdIn(acts.keySet());

        BigDecimal[] byScope = {BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO};
        TreeMap<String, BigDecimal[]> months = new TreeMap<>();
        Map<String, SourceItem> sources = new TreeMap<>();
        for (EmissionRecord r : recs) {
            ActivityData a = acts.get(r.getActivityDataId());
            int s = r.getScope() - 1;
            byScope[s] = byScope[s].add(r.getCo2eKg());
            String month = a.getActivityDate().toString().substring(0, 7);
            BigDecimal[] m = months.computeIfAbsent(month, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
            m[s] = m[s].add(r.getCo2eKg());
            String key = a.getCategory().name() + "|" + a.getSubCategory();
            SourceItem prev = sources.get(key);
            sources.put(key, new SourceItem(a.getCategory().name(), a.getSubCategory(), r.getScope(),
                    (prev == null ? BigDecimal.ZERO : prev.co2eKg()).add(r.getCo2eKg())));
        }
        return new PeriodSummary(periodId, byScope[0].add(byScope[1]).add(byScope[2]), byScope[0], byScope[1], byScope[2],
                months.entrySet().stream().map(e -> new MonthlyPoint(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2])).toList(),
                sources.values().stream().sorted(Comparator.comparing(SourceItem::co2eKg).reversed()).toList());
    }
}
