package com.ecotrace.validation;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class FuelRulesTest {

    private final FuelRules rules = new FuelRules();

    @Test
    void rejectsNegativeQuantity() {
        var issues = rules.validateLine("DIESEL", new BigDecimal("-50"), "litre");
        assertThat(issues).extracting(ValidationIssue::code).contains("NON_POSITIVE");
    }
}

