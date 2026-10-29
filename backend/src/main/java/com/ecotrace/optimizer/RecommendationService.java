package com.ecotrace.optimizer;

import com.ecotrace.calculation.SummaryService;
import com.ecotrace.optimizer.domain.Recommendation;
import com.ecotrace.optimizer.rules.RecommendationRule;
import com.ecotrace.optimizer.simulation.ScenarioSimulator;
import com.ecotrace.organization.service.OrganizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Chạy bộ quy tắc đề xuất giảm phát thải cho một kỳ báo cáo (mục 9.4 — Sprint 6). */
@Service
public class RecommendationService {

    private final OrganizationService organizationService;
    private final SummaryService summaryService;
    private final List<RecommendationRule> rules;
    private final ScenarioSimulator simulator;

    public RecommendationService(OrganizationService organizationService, SummaryService summaryService,
                                 List<RecommendationRule> rules, ScenarioSimulator simulator) {
        this.organizationService = organizationService;
        this.summaryService = summaryService;
        this.rules = rules;
        this.simulator = simulator;
    }

    @Transactional
    public List<Recommendation> generate(UUID periodId) {
        var summary = summaryService.getSummary(periodId);
        return rules.stream()
                .filter(r -> r.applies(summary))
                .map(r -> r.build(summary, simulator))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Recommendation> list(UUID periodId) {
        organizationService.requirePeriod(periodId);
        return List.of();
    }
}

