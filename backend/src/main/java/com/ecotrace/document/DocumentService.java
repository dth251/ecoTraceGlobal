package com.ecotrace.document;

import com.ecotrace.activity.ActivityRepository;
import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.document.domain.Document;
import com.ecotrace.document.storage.FileStorage;
import com.ecotrace.entry.EntryMapper;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.service.OrganizationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Dịch vụ quản lý chứng từ (Sprint 2). */
@Service
public class DocumentService {

    private static final long MAX_BYTES = 20L * 1024 * 1024;
    private static final Map<String, String> ALLOWED = Map.of(
            "pdf", "application/pdf", "png", "image/png", "jpg", "image/jpeg", "jpeg", "image/jpeg", "webp", "image/webp");

    /** Chứng từ trả cho frontend (khớp DocumentItem ở frontend). */
    public record DocumentDto(UUID id, UUID periodId, String fileName, Document.DocType docType, Document.Status status,
                              int activityCount, Instant uploadedAt, UUID enteredBy, String rejectReason,
                              boolean aiDraft) {
    }

    private final DocumentRepository documents;
    private final ActivityRepository activities;
    private final FileStorage storage;
    private final OrganizationService organizationService;
    private final AuditService audit;

    public DocumentService(DocumentRepository documents, ActivityRepository activities, FileStorage storage,
                           OrganizationService organizationService, AuditService audit) {
        this.documents = documents;
        this.activities = activities;
        this.storage = storage;
        this.organizationService = organizationService;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> list(UUID periodId, Document.Status status) {
        organizationService.requirePeriod(periodId);
        UUID orgId = TenantContext.organizationId();
        List<Document> docs = status == null
                ? documents.findAllByOrganizationIdAndPeriodIdOrderByCreatedAtDesc(orgId, periodId)
                : documents.findAllByOrganizationIdAndPeriodIdAndStatusOrderByCreatedAtDesc(orgId, periodId, status);
        return docs.stream().map(this::toDto).toList();
    }

    public DocumentDto toDto(Document d) {
        return new DocumentDto(d.getId(), d.getPeriodId(), d.getFileName(), d.getDocType(), d.getStatus(),
                activities.findAllBySourceDocumentId(d.getId()).size(), d.getCreatedAt(), d.getEnteredBy(),
                d.getRejectReason(), d.getAiExtraction() != null);
    }

    /** Tải chứng từ lên kỳ đang mở: kiểm tra định dạng, dung lượng, chống trùng theo SHA-256 rồi lưu file. */
    @Transactional
    public DocumentDto upload(UUID periodId, Document.DocType docType, MultipartFile file) {
        ReportingPeriod period = organizationService.requireOpenPeriod(periodId);
        UUID orgId = TenantContext.organizationId();
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        if (!ALLOWED.containsKey(ext)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_FILE_TYPE", "Only PDF, PNG, JPG, WEBP are accepted");
        }
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_SIZE_INVALID", "File must be between 1 byte and 20MB");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_UNREADABLE", "Cannot read uploaded file");
        }
        String sha = sha256(bytes);
        documents.findByOrganizationIdAndSha256(orgId, sha).ifPresent(existing -> {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_DOCUMENT", "This file was already uploaded",
                    Map.of("documentId", existing.getId().toString(), "periodId", existing.getPeriodId().toString()));
        });
        String key = orgId + "/" + periodId + "/" + UUID.randomUUID() + "." + ext;
        storage.putObject(key, ALLOWED.get(ext), bytes);
        Document doc = documents.save(new Document(orgId, period.getFacilityId(), periodId,
                docType != null ? docType : Document.DocType.OTHER, key, name, ALLOWED.get(ext), bytes.length, sha,
                TenantContext.userId()));
        audit.record(AuditService.CREATE, "document", doc.getId(), null, Map.of("fileName", name, "sha256", sha));
        return toDto(doc);
    }

    /**
     * Lưu kết quả AI bóc tách làm bản nháp. Bản nháp không được tính vào kiểm kê; người dùng phải đối chiếu và lưu nhập liệu.
     */
    @Transactional
    public DocumentDto attachAiDraft(UUID documentId, Map<String, Object> extraction) {
        Document doc = require(documentId);
        organizationService.requireOpenPeriod(doc.getPeriodId());
        if (doc.getStatus() == Document.Status.ENTERED) {
            throw new ApiException(HttpStatus.CONFLICT, "DOCUMENT_ALREADY_ENTERED", "Document data was already confirmed");
        }
        doc.attachAiDraft(extraction, EntryMapper.docTypeOf(extraction));
        return toDto(doc);
    }

    @Transactional(readOnly = true)
    public Map<String, String> getPresignedFileUrl(UUID documentId) {
        Document doc = require(documentId);
        return Map.of("url", storage.presignGetUrl(doc.getStorageKey()).toString(), "contentType", doc.getMimeType());
    }

    public Document require(UUID documentId) {
        return documents.findByIdAndOrganizationId(documentId, TenantContext.organizationId())
                .orElseThrow(() -> ApiException.notFound("document", documentId));
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
