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

/** Tính phát thải Scope 3 (cat. 4 & 9) cho vận chuyển: tấn·km × EF phương thức — mục 8.1. */
@Component
public class TransportCalculator implements EmissionCalculator {

    private final UnitConverter unitConverter;

    public TransportCalculator(UnitConverter unitConverter) {
        this.unitConverter = unitConverter;
    }

    @Override
    public boolean supports(ActivityCategory category) {
        return category == ActivityCategory.UPSTREAM_TRANSPORT
                || category == ActivityCategory.DOWNSTREAM_TRANSPORT;
    }

    @Override
    public EmissionResult calculate(ActivityData activity, String gridRegion, EmissionFactorResolver factors) {
        EmissionFactor ef = factors.resolve(activity.getCategory(),
                activity.getSubCategory(), gridRegion, activity.getActivityDate());
        BigDecimal tkm = unitConverter.convert(activity.getQuantity(), activity.getUnit(), ef.getUnitDenominator());
        BigDecimal co2eKg = tkm.multiply(ef.getValue()).setScale(6, RoundingMode.HALF_UP);
        return new EmissionResult(ef.getId(), (short) 3, activity.getCategory().getScope3Category(),
                co2eKg, "ACTIVITY_BASED");
    }
}

