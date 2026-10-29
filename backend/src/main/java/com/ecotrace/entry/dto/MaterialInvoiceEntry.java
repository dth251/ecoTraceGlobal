package com.ecotrace.entry.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Dữ liệu nhập từ hóa đơn nguyên liệu (mục 7.2, 13). */
public record MaterialInvoiceEntry(
        String supplierName,
        UUID supplierId,
        String originCountry,
        LocalDate invoiceDate,
        List<MaterialLine> lines) {

    public record MaterialLine(String description, String materialGroup,
                               BigDecimal quantity, String unit, String originCountry) {
    }
}

