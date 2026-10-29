package com.ecotrace.optimizer.rules;

import com.ecotrace.calculation.SummaryService.PeriodSummary;
import com.ecotrace.optimizer.domain.Recommendation;
import com.ecotrace.optimizer.simulation.ScenarioSimulator;
import org.springframework.stereotype.Component;

/** Quy tắc R_SUPPLIER: một nguyên liệu chiếm ≥ 30% Scope 3 và đang dùng giá trị mặc định — mục 9.2 (Sprint 6). */
@Component
public class SupplierRule implements RecommendationRule {
    @Override public String code() { return "R_SUPPLIER"; }
    @Override public boolean applies(PeriodSummary s) { return false; }
    @Override public Recommendation build(PeriodSummary s, ScenarioSimulator sim) { return null; }
}

