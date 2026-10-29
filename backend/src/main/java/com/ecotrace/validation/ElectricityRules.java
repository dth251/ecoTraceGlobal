package com.ecotrace.validation;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Quy tắc kiểm tra dữ liệu hóa đơn điện (mục 7.4). */
@Component
public class ElectricityRules {

    public List<ValidationIssue> validate(LocalDate fromDate, LocalDate toDate,
                                          BigDecimal totalKwh, List<BigDecimal> bandKwhs) {
        List<ValidationIssue> issues = new ArrayList<>();
        if (fromDate != null && toDate != null && toDate.isBefore(fromDate)) {
            issues.add(ValidationIssue.error("billing_period_end", "END_BEFORE_START",
                    "to_date must be >= from_date"));
        }
        if (totalKwh == null || totalKwh.compareTo(BigDecimal.ZERO) <= 0) {
            issues.add(ValidationIssue.error("total_kwh", "NON_POSITIVE_KWH", "total_kwh must be > 0"));
        } else if (bandKwhs != null && !bandKwhs.isEmpty()) {
            BigDecimal sum = bandKwhs.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            if (sum.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal diffRatio = sum.subtract(totalKwh).abs()
                        .divide(totalKwh, java.math.MathContext.DECIMAL64);
                // Tổng theo khung giờ lệch > 1% so với tổng kWh → lỗi chặn (mục 7.4)
                if (diffRatio.compareTo(new BigDecimal("0.01")) > 0) {
                    issues.add(ValidationIssue.error("total_kwh", "BAND_SUM_MISMATCH",
                            "Sum of time bands does not match total_kwh"));
                }
            }
        }
        return issues;
    }
}

