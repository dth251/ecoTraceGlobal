package com.ecotrace.document;

import com.ecotrace.activity.ActivityRepository;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.document.domain.Document;
import com.ecotrace.document.storage.FileStorage;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    private static final long MAX_BYTES = 20L * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("application/pdf", "image/jpeg", "image/png");

    private final DocumentRepository documents;
    private final FileStorage storage;
    private final OrganizationService organizationService;
    private final ActivityRepository activities;
    private final AuditService audit;

    public DocumentService(DocumentRepository documents, FileStorage storage, OrganizationService organizationService,
                           ActivityRepository activities, AuditService audit) {
        this.documents = documents;
        this.storage = storage;
        this.organizationService = organizationService;
        this.activities = activities;
        this.audit = audit;
    }

    /** Chứng từ trả cho frontend, kèm số dòng hoạt động đã nhập từ chứng từ. */
    public record DocumentView(UUID id, UUID periodId, String fileName, Document.DocType docType,
                               Document.Status status, int activityCount, Instant uploadedAt, UUID enteredBy,
                               String mimeType, long sizeBytes, String rejectReason) {
    }

    public record FileContent(byte[] bytes, String contentType, String fileName) {
    }

    @Transactional(readOnly = true)
    public List<DocumentView> list(UUID periodId, Document.Status status) {
        UUID orgId = TenantContext.organizationId();
        List<Document> list = status == null
                ? documents.findAllByOrganizationIdAndPeriodIdOrderByCreatedAtDesc(orgId, periodId)
                : documents.findAllByOrganizationIdAndPeriodIdAndStatusOrderByCreatedAtDesc(orgId, periodId, status);
        Map<UUID, Long> counts = activities.findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(orgId, periodId)
                .stream()
                .filter(a -> a.getSourceDocumentId() != null)
                .collect(Collectors.groupingBy(ActivityData::getSourceDocumentId, Collectors.counting()));
        return list.stream().map(d -> toView(d, counts.getOrDefault(d.getId(), 0L).intValue())).toList();
    }

    /** Kiểm tra định dạng/dung lượng, chống trùng bằng SHA-256, lưu file rồi ghi bảng document (mục 7.2). */
    @Transactional
    public DocumentView upload(UUID periodId, Document.DocType docType, MultipartFile file) {
        ReportingPeriod period = organizationService.requireOpenPeriod(periodId);
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "File is required");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "File must be 20MB or smaller");
        }
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_FILE_TYPE",
                    "Only PDF, JPEG or PNG files are accepted");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Cannot read uploaded file");
        }
        UUID orgId = TenantContext.organizationId();
        String sha256 = sha256Hex(bytes);
        if (documents.existsByOrganizationIdAndSha256(orgId, sha256)) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_DOCUMENT", "This file was already uploaded",
                    Map.of("sha256", sha256));
        }

        String fileName = safeFileName(file.getOriginalFilename());
        String key = orgId + "/" + periodId + "/" + UUID.randomUUID() + "-" + fileName;
        storage.putObject(key, contentType, bytes);

        Document doc = documents.save(new Document(orgId, period.getFacilityId(), periodId, docType, key, fileName,
                contentType, bytes.length, sha256, TenantContext.userId()));
        audit.record(AuditService.CREATE, "document", doc.getId(), null, Map.of("fileName", fileName));
        return toView(doc, 0);
    }

    /** URL xem file: URL ký tạm của S3, hoặc đường dẫn API /documents/{id}/content khi lưu cục bộ. */
    @Transactional(readOnly = true)
    public Map<String, String> getFileUrl(UUID documentId) {
        Document doc = require(documentId);
        Map<String, String> res = new LinkedHashMap<>();
        res.put("contentType", doc.getMimeType());
        storage.presignGetUrl(doc.getStorageKey()).ifPresentOrElse(
                url -> res.put("url", url.toString()),
                () -> res.put("contentPath", "/documents/" + documentId + "/content"));
        return res;
    }

    @Transactional(readOnly = true)
    public FileContent getContent(UUID documentId) {
        Document doc = require(documentId);
        return new FileContent(storage.getObject(doc.getStorageKey()), doc.getMimeType(), doc.getFileName());
    }

    /** Đánh dấu đã nhập và lưu tường minh (entity có thể đã bị tách khỏi persistence context bởi truy vấn xóa hàng loạt) */
    @Transactional
    public Document markEntered(UUID documentId, UUID userId) {
        Document doc = require(documentId);
        doc.markEntered(userId);
        return documents.save(doc);
    }

    @Transactional
    public Document reject(UUID documentId, String reason) {
        Document doc = require(documentId);
        doc.reject(reason);
        return documents.save(doc);
    }

    public Document require(UUID documentId) {
        return documents.findByIdAndOrganizationId(documentId, TenantContext.organizationId())
                .orElseThrow(() -> ApiException.notFound("document", documentId));
    }

    public DocumentView toView(Document d, int activityCount) {
        return new DocumentView(d.getId(), d.getPeriodId(), d.getFileName(), d.getDocType(), d.getStatus(),
                activityCount, d.getCreatedAt(), d.getEnteredBy(), d.getMimeType(), d.getSizeBytes(),
                d.getRejectReason());
    }

    private static String safeFileName(String name) {
        String base = name == null || name.isBlank() ? "document" : name.replace('\\', '/');
        base = base.substring(base.lastIndexOf('/') + 1);
        return base.replaceAll("[^\\p{L}\\p{N}._-]", "_");
    }

    private static String sha256Hex(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
