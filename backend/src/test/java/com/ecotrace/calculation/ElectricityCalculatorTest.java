package com.ecotrace.calculation;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.calculators.ElectricityCalculator;
import com.ecotrace.common.util.UnitConverter;
import com.ecotrace.emissionfactor.EmissionFactorResolver;
import com.ecotrace.emissionfactor.domain.EmissionFactor;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ElectricityCalculatorTest {

    @Test
    void calculatesScope2LocationBasedFromMwh() {
        // 120 MWh = 120.000 kWh; 120.000 × 0,68 = 81.600 kg CO2 (ví dụ mục 8.1)
        EmissionFactor ef = new EmissionFactor("VN_GRID", ActivityCategory.ELECTRICITY, "GRID", "VN",
                new BigDecimal("0.68"), "kgCO2", "kWh", "Test", 2025,
                LocalDate.of(2025, 1, 1), null, 1);
        EmissionFactorResolver resolver = new EmissionFactorResolver(mockRepoReturning(ef));
        ElectricityCalculator calc = new ElectricityCalculator(new UnitConverter());

        ActivityData act = new ActivityData(null, null, null, ActivityData.EntryMethod.DOCUMENT,
                ActivityCategory.ELECTRICITY, "GRID", new BigDecimal("120"), "MWh",
                LocalDate.of(2026, 8, 15));

        var result = calc.calculate(act, "VN", resolver);
        assertThat(result.scope()).isEqualTo((short) 2);
        assertThat(result.method()).isEqualTo("LOCATION_BASED");
        assertThat(result.co2eKg()).isEqualByComparingTo("81600");
    }

    private static com.ecotrace.emissionfactor.EmissionFactorRepository mockRepoReturning(EmissionFactor ef) {
        var repo = mock(com.ecotrace.emissionfactor.EmissionFactorRepository.class);
        when(repo.findMatching(any(), any(), any(), any())).thenReturn(List.of(ef));
        return repo;
    }
}

