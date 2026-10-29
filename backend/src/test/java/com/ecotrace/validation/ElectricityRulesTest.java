package com.ecotrace.validation;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ElectricityRulesTest {

    private final ElectricityRules rules = new ElectricityRules();

    @Test
    void acceptsMatchingBandSumWithinOnePercent() {
        var issues = rules.validate(
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31),
                new BigDecimal("120000"),
                List.of(new BigDecimal("70000"), new BigDecimal("30000"), new BigDecimal("20000")));
        assertThat(issues).isEmpty();
    }

    @Test
    void flagsEndBeforeStartAndBandMismatch() {
        var issues = rules.validate(
                LocalDate.of(2026, 8, 31), LocalDate.of(2026, 8, 1),
                new BigDecimal("120000"),
                List.of(new BigDecimal("50000")));
        assertThat(issues).extracting(ValidationIssue::code)
                .containsExactlyInAnyOrder("END_BEFORE_START", "BAND_SUM_MISMATCH");
    }
}

