package com.ecotrace.calculation;

import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.organization.service.OrganizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/** Tổng hợp phát thải theo scope, tháng, nguồn cho Dashboard và bộ quy tắc đề xuất (Sprint 4). */
@Service
public class SummaryService {

    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final int TOP_SOURCES = 5;

    private final OrganizationService organizationService;
    private final EmissionRecordRepository records;

    public SummaryService(OrganizationService organizationService, EmissionRecordRepository records) {
        this.organizationService = organizationService;
        this.records = records;
    }

    public record PeriodSummary(
            UUID periodId,
            BigDecimal totalCo2eKg,
            BigDecimal scope1Co2eKg,
            BigDecimal scope2Co2eKg,
            BigDecimal scope3Co2eKg,
            List<MonthlyPoint> byMonth,
            List<SourceItem> topSources,
            Instant calculatedAt) {
    }

    public record MonthlyPoint(String month, BigDecimal scope1Kg, BigDecimal scope2Kg, BigDecimal scope3Kg) {
    }

    public record SourceItem(String category, String subCategory, short scope, BigDecimal co2eKg) {
    }

    @Transactional(readOnly = true)
    public PeriodSummary getSummary(UUID periodId) {
        organizationService.requirePeriod(periodId);
        List<PeriodEmissionRow> rows = records.findPeriodRows(TenantContext.organizationId(), periodId);

        BigDecimal[] byScope = {BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO};
        Map<String, BigDecimal[]> byMonth = new TreeMap<>();
        Map<String, SourceItem> bySource = new LinkedHashMap<>();
        Instant calculatedAt = null;

        for (PeriodEmissionRow r : rows) {
            int idx = r.scope() - 1;
            byScope[idx] = byScope[idx].add(r.co2eKg());

            BigDecimal[] month = byMonth.computeIfAbsent(r.activityDate().format(MONTH),
                    k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
            month[idx] = month[idx].add(r.co2eKg());

            String key = r.category() + "/" + r.subCategory();
            SourceItem prev = bySource.get(key);
            bySource.put(key, new SourceItem(r.category().name(), r.subCategory(), r.scope(),
                    prev == null ? r.co2eKg() : prev.co2eKg().add(r.co2eKg())));

            if (calculatedAt == null || r.calculatedAt().isAfter(calculatedAt)) {
                calculatedAt = r.calculatedAt();
            }
        }

        List<MonthlyPoint> months = byMonth.entrySet().stream()
                .map(e -> new MonthlyPoint(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2]))
                .toList();
        List<SourceItem> top = bySource.values().stream()
                .sorted(Comparator.comparing(SourceItem::co2eKg).reversed())
                .limit(TOP_SOURCES)
                .toList();

        return new PeriodSummary(periodId, byScope[0].add(byScope[1]).add(byScope[2]),
                byScope[0], byScope[1], byScope[2], months, top, calculatedAt);
    }
}
