package com.ecotrace.importer;

import com.ecotrace.importer.domain.ImportBatch;
import com.ecotrace.importer.template.TemplateType;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Tag(name = "Excel Imports")
@RestController
@RequestMapping("/imports")
public class ImportController {

    private static final String XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ImportService service;

    public ImportController(ImportService service) {
        this.service = service;
    }

    @GetMapping("/templates/{type}.xlsx")
    public ResponseEntity<byte[]> downloadTemplate(@PathVariable String type) {
        TemplateType tt = TemplateType.valueOf(type.toUpperCase(Locale.ROOT));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=template_" + tt.name().toLowerCase() + ".xlsx")
                .contentType(MediaType.parseMediaType(XLSX_MIME))
                .body(service.downloadTemplate(tt));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public ImportBatch uploadAndValidate(@RequestParam UUID periodId,
                                         @RequestParam TemplateType templateType,
                                         @RequestPart("file") MultipartFile file) {
        return service.validateUpload(periodId, templateType, file);
    }

    @GetMapping
    public List<ImportBatch> list(@RequestParam UUID periodId) {
        return service.list(periodId);
    }

    @GetMapping("/{id}")
    public ImportBatch get(@PathVariable UUID id) {
        return service.get(id);
    }

    @GetMapping("/{id}/errors.xlsx")
    public ResponseEntity<byte[]> downloadErrors(@PathVariable UUID id) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=import_errors.xlsx")
                .contentType(MediaType.parseMediaType(XLSX_MIME))
                .body(service.downloadErrorsFile(id));
    }

    @PostMapping("/{id}/commit")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public ImportBatch commit(@PathVariable UUID id) {
        return service.commit(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public void cancel(@PathVariable UUID id) {
        service.cancel(id);
    }
}

