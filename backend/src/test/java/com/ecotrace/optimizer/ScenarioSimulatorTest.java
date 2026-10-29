package com.ecotrace.optimizer;

import com.ecotrace.optimizer.simulation.SolarRooftopScenario;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ScenarioSimulatorTest {

    @Test
    void solarRooftopFormula() {
        SolarRooftopScenario solar = new SolarRooftopScenario();
        // 300 kWp × 1.350 kWh/kWp/năm × 0,68 kgCO2/kWh = 275.400 kg CO2e
        BigDecimal kg = solar.calculateReductionKg(
                new BigDecimal("300"), new BigDecimal("1350"), new BigDecimal("0.68"));
        assertThat(kg).isEqualByComparingTo("275400");
    }
}

