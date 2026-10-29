package com.ecotrace.entry.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Dữ liệu nhập từ vận đơn (mục 7.2, 13). */
public record BillOfLadingEntry(
        String billNo,
        String direction,
        String origin,
        String destination,
        String mode,
        BigDecimal weightKg,
        BigDecimal distanceKm,
        LocalDate date) {
}

