package com.ecotrace.calculation;

import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.util.UnitConverter;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UnitConverterTest {

    private final UnitConverter converter = new UnitConverter();

    @Test
    void convertsEnergyAndMassUnitsPrecisely() {
        assertThat(converter.convert(new BigDecimal("1.5"), "MWh", "kWh"))
                .isEqualByComparingTo("1500");
        assertThat(converter.convert(new BigDecimal("2.5"), "t", "kg"))
                .isEqualByComparingTo("2500");
        assertThat(converter.convert(new BigDecimal("100"), "lít", "litre"))
                .isEqualByComparingTo("100");
    }

    @Test
    void rejectsIncompatibleDimensions() {
        assertThatThrownBy(() -> converter.convert(BigDecimal.ONE, "kWh", "kg"))
                .isInstanceOf(ApiException.class)
                .extracting("code").isEqualTo("UNIT_NOT_CONVERTIBLE");
    }
}

