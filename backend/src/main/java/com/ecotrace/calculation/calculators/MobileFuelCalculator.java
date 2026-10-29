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

/** Tính phát thải Scope 1 cho nhiên liệu di động (xe nâng, xe tải công ty) — mục 8.1. */
@Component
public class MobileFuelCalculator implements EmissionCalculator {

    private final UnitConverter unitConverter;

    public MobileFuelCalculator(UnitConverter unitConverter) {
        this.unitConverter = unitConverter;
    }

    @Override
    public boolean supports(ActivityCategory category) {
        return category == ActivityCategory.MOBILE_FUEL;
    }

    @Override
    public EmissionResult calculate(ActivityData activity, String gridRegion, EmissionFactorResolver factors) {
        EmissionFactor ef = factors.resolve(ActivityCategory.MOBILE_FUEL,
                activity.getSubCategory(), gridRegion, activity.getActivityDate());
        BigDecimal qty = unitConverter.convert(activity.getQuantity(), activity.getUnit(), ef.getUnitDenominator());
        BigDecimal co2eKg = qty.multiply(ef.getValue()).setScale(6, RoundingMode.HALF_UP);
        return new EmissionResult(ef.getId(), (short) 1, null, co2eKg, "ACTIVITY_BASED");
    }
}

