package com.ecotrace.optimizer.rules;

import com.ecotrace.calculation.SummaryService.PeriodSummary;
import com.ecotrace.optimizer.domain.Recommendation;
import com.ecotrace.optimizer.simulation.ScenarioSimulator;
import org.springframework.stereotype.Component;

/** Quy tắc R_FUEL: có nhiên liệu đốt cố định (dầu DO, FO, than) — mục 9.2 (Sprint 6). */
@Component
public class FuelSwitchRule implements RecommendationRule {
    @Override public String code() { return "R_FUEL"; }
    @Override public boolean applies(PeriodSummary s) { return false; }
    @Override public Recommendation build(PeriodSummary s, ScenarioSimulator sim) { return null; }
}

