package com.ecotrace.calculation;

import com.ecotrace.organization.service.OrganizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Điều phối tính toán phát thải cho một kỳ báo cáo (Sprint 3). */
@Service
public class CalculationService {

    private final OrganizationService organizationService;

    public CalculationService(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @Transactional
    public Map<String, Object> calculatePeriod(UUID periodId) {
        organizationService.requireOpenPeriod(periodId);
        // TODO Sprint 3: duyệt toàn bộ activity_data của kỳ, gọi EmissionCalculator tương ứng, ghi emission_record
        return Map.of("periodId", periodId, "calculatedAt", Instant.now(), "recordsCalculated", 0);
    }
}

