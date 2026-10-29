package com.ecotrace.optimizer.rules;

import com.ecotrace.calculation.SummaryService.PeriodSummary;
import com.ecotrace.optimizer.domain.Recommendation;
import com.ecotrace.optimizer.simulation.ScenarioSimulator;
import org.springframework.stereotype.Component;

/** Quy tắc R_DATA: tỷ lệ dữ liệu thực tế của sản phẩm < 50% — mục 9.2 (Sprint 6). */
@Component
public class DataQualityRule implements RecommendationRule {
    @Override public String code() { return "R_DATA"; }
    @Override public boolean applies(PeriodSummary s) { return false; }
    @Override public Recommendation build(PeriodSummary s, ScenarioSimulator sim) { return null; }
}

