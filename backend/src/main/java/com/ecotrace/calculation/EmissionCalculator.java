package com.ecotrace.calculation;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.emissionfactor.EmissionFactorResolver;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Giao diện bộ tính phát thải cho từng hạng mục hoạt động (mục 8.3).
 * Mọi phép tính dùng {@link BigDecimal}, không dùng double.
 */
public interface EmissionCalculator {

    boolean supports(ActivityCategory category);

    EmissionResult calculate(ActivityData activity, String gridRegion, EmissionFactorResolver factors);

    record EmissionResult(UUID emissionFactorId, short scope, Short scope3Category,
                          BigDecimal co2eKg, String method) {
    }
}

