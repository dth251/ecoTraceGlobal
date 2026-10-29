package com.ecotrace.entry.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Dữ liệu nhập từ hóa đơn nhiên liệu (mục 7.2, 13). */
public record FuelInvoiceEntry(
        String supplierName,
        String invoiceNo,
        LocalDate invoiceDate,
        List<FuelLine> lines,
        BigDecimal totalAmount) {

    public record FuelLine(String description, String fuelType, String usage,
                           BigDecimal quantity, String unit) {
    }
}

