package com.ecotrace.entry.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Dữ liệu nhập từ hóa đơn điện (mục 7.2, 13). */
public record ElectricityBillEntry(
        String supplierName,
        String customerCode,
        String meterCode,
        LocalDate billingPeriodStart,
        LocalDate billingPeriodEnd,
        List<ConsumptionLine> consumptionLines,
        BigDecimal totalKwh,
        BigDecimal totalAmount) {

    public record ConsumptionLine(String timeBand, BigDecimal kwh) {
    }
}

