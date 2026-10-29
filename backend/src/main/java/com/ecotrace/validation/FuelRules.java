package com.ecotrace.validation;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** Quy tắc kiểm tra hóa đơn nhiên liệu (mục 7.4 — hoàn thiện ở Sprint 2). */
@Component
public class FuelRules {

    public List<ValidationIssue> validateLine(String fuelType, BigDecimal quantity, String unit) {
        List<ValidationIssue> issues = new ArrayList<>();
        if (fuelType == null || fuelType.isBlank()) {
            issues.add(ValidationIssue.error("fuel_type", "REQUIRED", "fuel_type is required"));
        }
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            issues.add(ValidationIssue.error("quantity", "NON_POSITIVE", "quantity must be > 0"));
        }
        return issues;
    }
}

