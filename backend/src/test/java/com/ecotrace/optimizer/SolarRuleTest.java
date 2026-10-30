package com.ecotrace.optimizer;

import com.ecotrace.calculation.SummaryService.PeriodSummary;
import com.ecotrace.optimizer.rules.SolarRule;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SolarRuleTest {

    @Test
    void triggersWhenElectricityIsAtLeastFortyPercentOfScope1And2() {
        SolarRule rule = new SolarRule(new BigDecimal("0.40"));
        PeriodSummary highElec = new PeriodSummary(UUID.randomUUID(),
                new BigDecimal("100000"), new BigDecimal("20000"), new BigDecimal("60000"), new BigDecimal("20000"),
                List.of(), List.of(), null);
        PeriodSummary lowElec = new PeriodSummary(UUID.randomUUID(),
                new BigDecimal("100000"), new BigDecimal("70000"), new BigDecimal("10000"), new BigDecimal("20000"),
                List.of(), List.of(), null);

        assertThat(rule.applies(highElec)).isTrue();
        assertThat(rule.applies(lowElec)).isFalse();
    }
}

