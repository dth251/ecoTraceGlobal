package com.ecotrace.report;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Tag(name = "Reports")
@RestController
@RequestMapping("/periods/{id}/reports")
public class ReportController {

    private final GhgPdfReportService ghgPdfReportService;
    private final CbamExcelExportService cbamExcelExportService;

    public ReportController(GhgPdfReportService ghgPdfReportService, CbamExcelExportService cbamExcelExportService) {
        this.ghgPdfReportService = ghgPdfReportService;
        this.cbamExcelExportService = cbamExcelExportService;
    }

    @GetMapping(value = "/ghg.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> ghgPdf(@PathVariable UUID id,
                                         @RequestHeader(name = HttpHeaders.ACCEPT_LANGUAGE, defaultValue = "vi") String lang) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ghg_report_" + id + ".pdf")
                .body(ghgPdfReportService.generate(id, lang));
    }

    @GetMapping("/cbam.xlsx")
    public ResponseEntity<byte[]> cbamExcel(@PathVariable UUID id) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=cbam_communication_" + id + ".xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(cbamExcelExportService.generate(id));
    }
}

