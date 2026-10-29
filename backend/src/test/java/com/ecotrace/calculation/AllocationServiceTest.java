package com.ecotrace.calculation;

import com.ecotrace.product.AllocationService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class AllocationServiceTest {

    @Test
    void allocatesKgCo2ePerTonneOfOutput() {
        AllocationService service = new AllocationService(null, null, null, null, null, null, null);
        // 81.600 kg CO2e (= 81,6 tCO2e) chia cho 240 tấn sản phẩm = 0,34 tCO2e/tấn
        BigDecimal perTonne = service.allocateByMassPerTonne(new BigDecimal("81600"), new BigDecimal("240"));
        assertThat(perTonne).isEqualByComparingTo("0.34");
    }
}

