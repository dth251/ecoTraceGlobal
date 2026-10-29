package com.ecotrace.document;

import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.document.domain.Document;
import com.ecotrace.document.storage.FileStorage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Dịch vụ quản lý chứng từ (Sprint 2). */
@Service
public class DocumentService {

    private final DocumentRepository documents;
    private final FileStorage storage;

    public DocumentService(DocumentRepository documents, FileStorage storage) {
        this.documents = documents;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public List<Document> list(UUID periodId, Document.Status status) {
        UUID orgId = TenantContext.organizationId();
        return status == null
                ? documents.findAllByOrganizationIdAndPeriodIdOrderByCreatedAtDesc(orgId, periodId)
                : documents.findAllByOrganizationIdAndPeriodIdAndStatusOrderByCreatedAtDesc(orgId, periodId, status);
    }

    public Document upload(UUID periodId, Document.DocType docType, MultipartFile file) {
        // TODO Sprint 2: kiểm tra định dạng/dung lượng, tính sha256 chống trùng, lưu S3 và bảng document
        throw ApiException.notImplemented("POST /documents");
    }

    @Transactional(readOnly = true)
    public Map<String, String> getPresignedFileUrl(UUID documentId) {
        Document doc = documents.findByIdAndOrganizationId(documentId, TenantContext.organizationId())
                .orElseThrow(() -> ApiException.notFound("document", documentId));
        return Map.of("url", storage.presignGetUrl(doc.getStorageKey()).toString());
    }
}

