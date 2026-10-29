package com.ecotrace.optimizer.rules;

import com.ecotrace.calculation.SummaryService.PeriodSummary;
import com.ecotrace.optimizer.domain.Recommendation;
import com.ecotrace.optimizer.simulation.ScenarioSimulator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Quy tắc R_SOLAR: kích hoạt khi điện (Scope 2) chiếm ≥ ngưỡng (mặc định 40%) tổng Scope 1+2 — mục 9.2. */
@Component
public class SolarRule implements RecommendationRule {

    private final BigDecimal minShare;

    public SolarRule(@Value("${app.optimizer.solar-min-electricity-share:0.40}") BigDecimal minShare) {
        this.minShare = minShare;
    }

    @Override
    public String code() {
        return "R_SOLAR";
    }

    @Override
    public boolean applies(PeriodSummary s) {
        BigDecimal s12 = s.scope1Co2eKg().add(s.scope2Co2eKg());
        if (s12.compareTo(BigDecimal.ZERO) <= 0) return false;
        BigDecimal share = s.scope2Co2eKg().divide(s12, 4, RoundingMode.HALF_UP);
        return share.compareTo(minShare) >= 0;
    }

    @Override
    public Recommendation build(PeriodSummary s, ScenarioSimulator sim) {
        return new Recommendation(s.periodId(), null, code(),
                "Lắp điện mặt trời áp mái",
                "Điện chiếm tỷ trọng lớn trong phát thải nhà máy; lắp điện mặt trời áp mái giúp giảm Scope 2.",
                (short) 1);
    }
}

