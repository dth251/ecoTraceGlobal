package com.ecotrace.optimizer.simulation;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Kịch bản lắp điện mặt trời áp mái: Giảm = kWp × sản lượng (kWh/kWp/năm) × EF lưới (mục 9.3). */
@Component
public class SolarRooftopScenario {

    public BigDecimal calculateReductionKg(BigDecimal capacityKwp, BigDecimal yieldKwhPerKwp, BigDecimal gridEfKgPerKwh) {
        return capacityKwp.multiply(yieldKwhPerKwp).multiply(gridEfKgPerKwh).setScale(6, RoundingMode.HALF_UP);
    }
}

