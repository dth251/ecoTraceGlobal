package com.ecotrace.document;

import com.ecotrace.document.domain.Document;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
    public List<DocumentService.DocumentDto> list(@RequestParam UUID periodId,
                               @RequestParam(required = false) Document.Status status) {
        return service.list(periodId, status);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public DocumentService.DocumentDto upload(@RequestParam UUID periodId,
                                              @RequestParam(required = false) Document.DocType docType,
                                              @RequestPart("file") MultipartFile file) {
        return service.upload(periodId, docType, file);
    }

    /** Lưu kết quả AI bóc tách làm bản nháp (chưa tính vào kiểm kê cho tới khi người dùng xác nhận). */
    @PutMapping("/{id}/ai-draft")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public DocumentService.DocumentDto aiDraft(@PathVariable UUID id, @RequestBody Map<String, Object> extraction) {
        return service.attachAiDraft(id, extraction);
    }

    @GetMapping("/{id}/file")
    public Map<String, String> getFileUrl(@PathVariable UUID id) {
        return service.getPresignedFileUrl(id);
    }
}

