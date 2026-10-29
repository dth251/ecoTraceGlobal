package com.ecotrace.optimizer.rules;

import com.ecotrace.calculation.SummaryService.PeriodSummary;
import com.ecotrace.optimizer.domain.Recommendation;
import com.ecotrace.optimizer.simulation.ScenarioSimulator;

/** Giao diện một quy tắc đề xuất giảm phát thải (mục 9.2). */
public interface RecommendationRule {

    String code();

    boolean applies(PeriodSummary summary);

    Recommendation build(PeriodSummary summary, ScenarioSimulator simulator);
}

