package com.ecotrace.calculation;

import com.ecotrace.activity.domain.ActivityCategory;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Một dòng phát thải kèm thông tin hoạt động nguồn, dùng để tổng hợp theo kỳ. */
public record PeriodEmissionRow(ActivityCategory category, String subCategory, LocalDate activityDate, short scope,
                                BigDecimal co2eKg, Instant calculatedAt) {
}
