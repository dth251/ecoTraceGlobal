package com.ecotrace.calculation.calculators;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.EmissionCalculator;
import com.ecotrace.common.util.UnitConverter;
import com.ecotrace.emissionfactor.EmissionFactorResolver;
import com.ecotrace.emissionfactor.domain.EmissionFactor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Tính phát thải Scope 2 cho điện lưới (LOCATION_BASED): kWh × EF lưới điện — mục 8.1, 8.3. */
@Component
public class ElectricityCalculator implements EmissionCalculator {

    private final UnitConverter unitConverter;

    public ElectricityCalculator(UnitConverter unitConverter) {
        this.unitConverter = unitConverter;
    }

    @Override
    public boolean supports(ActivityCategory category) {
        return category == ActivityCategory.ELECTRICITY;
    }

    @Override
    public EmissionResult calculate(ActivityData activity, String gridRegion, EmissionFactorResolver factors) {
        String sub = activity.getSubCategory() != null ? activity.getSubCategory() : "GRID";
        EmissionFactor ef = factors.resolve(ActivityCategory.ELECTRICITY, sub, gridRegion, activity.getActivityDate());
        BigDecimal kwh = unitConverter.convert(activity.getQuantity(), activity.getUnit(), ef.getUnitDenominator());
        BigDecimal co2eKg = kwh.multiply(ef.getValue()).setScale(6, RoundingMode.HALF_UP);
        return new EmissionResult(ef.getId(), (short) 2, null, co2eKg, "LOCATION_BASED");
    }
}

