package com.ecotrace.report;

import com.ecotrace.common.exception.ApiException;
import org.springframework.stereotype.Service;

import java.util.UUID;

/** Xuất dữ liệu phát thải nhúng theo mẫu trao đổi dữ liệu CBAM (Apache POI — Sprint 5). */
@Service
public class CbamExcelExportService {

    public byte[] generate(UUID periodId) {
        throw ApiException.notImplemented("GET /periods/{id}/reports/cbam.xlsx");
    }
}

