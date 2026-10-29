package com.ecotrace.calculation;

import com.ecotrace.organization.service.OrganizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Tổng hợp phát thải theo scope, tháng, nguồn cho Dashboard và bộ quy tắc đề xuất (Sprint 4). */
@Service
public class SummaryService {

    private final OrganizationService organizationService;

    public SummaryService(OrganizationService organizationService) {
        this.organizationService = organizationService;
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
        return new PeriodSummary(periodId, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                List.of(), List.of());
    }
}

