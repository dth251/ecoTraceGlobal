package com.ecotrace.emissionfactor;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.emissionfactor.domain.EmissionFactor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Chọn hệ số phát thải theo loại hoạt động, khu vực, ngày phát sinh hoạt động và phiên bản (mục 8.3).
 * Ưu tiên hệ số đúng khu vực trước, sau đó mới tới GLOBAL.
 */
@Component
public class EmissionFactorResolver {

    private final EmissionFactorRepository repository;

    public EmissionFactorResolver(EmissionFactorRepository repository) {
        this.repository = repository;
    }

    public EmissionFactor resolve(ActivityCategory category, String subCategory, String region, LocalDate activityDate) {
        return repository.findMatching(category, subCategory, region != null ? region : "GLOBAL", activityDate)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "EMISSION_FACTOR_NOT_FOUND",
                        "No emission factor for " + category + "/" + subCategory + " in " + region));
    }
}

