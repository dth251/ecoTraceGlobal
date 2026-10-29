package com.ecotrace.document;

import com.ecotrace.document.domain.Document;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Documents")
@RestController
@RequestMapping("/documents")
public class DocumentController {

    private final DocumentService service;

    public DocumentController(DocumentService service) {
        this.service = service;
    }

    @GetMapping
    public List<DocumentService.DocumentView> list(@RequestParam UUID periodId,
                                                   @RequestParam(required = false) Document.Status status) {
        return service.list(periodId, status);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public DocumentService.DocumentView upload(@RequestParam UUID periodId,
                                               @RequestParam Document.DocType docType,
                                               @RequestPart("file") MultipartFile file) {
        return service.upload(periodId, docType, file);
    }

    @GetMapping("/{id}/file")
    public Map<String, String> getFileUrl(@PathVariable UUID id) {
        return service.getFileUrl(id);
    }

    /** Tải nội dung file qua API có xác thực (dùng khi lưu cục bộ, không có URL ký tạm của S3). */
    @GetMapping("/{id}/content")
    public ResponseEntity<byte[]> content(@PathVariable UUID id) {
        DocumentService.FileContent f = service.getContent(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(f.fileName(), StandardCharsets.UTF_8).build().toString())
                .body(f.bytes());
    }
}
