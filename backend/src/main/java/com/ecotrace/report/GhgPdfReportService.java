package com.ecotrace.report;

import com.ecotrace.common.exception.ApiException;
import org.springframework.stereotype.Service;

import java.util.UUID;

/** Xuất báo cáo kiểm kê khí nhà kính dạng PDF từ HTML template bằng OpenHTMLtoPDF (Sprint 5). */
@Service
public class GhgPdfReportService {

    public byte[] generate(UUID periodId, String lang) {
        throw ApiException.notImplemented("GET /periods/{id}/reports/ghg.pdf");
    }
}

