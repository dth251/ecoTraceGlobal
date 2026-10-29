package com.ecotrace.document.domain;

import com.ecotrace.common.domain.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Chứng từ người dùng tải lên làm bằng chứng và nhập liệu — bảng document. */
@Entity
@Table(name = "document")
public class Document extends AuditableEntity {

    public enum DocType {
        ELECTRICITY_BILL,
        FUEL_INVOICE,
        MATERIAL_INVOICE,
        BILL_OF_LADING,
        OTHER
    }

    public enum Status {
        PENDING_ENTRY,
        ENTERED,
        REJECTED
    }

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "facility_id", nullable = false)
    private UUID facilityId;

    @Column(name = "period_id", nullable = false)
    private UUID periodId;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false, length = 32)
    private DocType docType;

    @Column(name = "storage_key", nullable = false, length = 512)
    private String storageKey;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.PENDING_ENTRY;

    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    @Column(name = "uploaded_by")
    private UUID uploadedBy;

    @Column(name = "entered_by")
    private UUID enteredBy;

    @Column(name = "entered_at")
    private Instant enteredAt;

    /** Bản nháp AI bóc tách (khối JSON của AI service). Chỉ là gợi ý cho tới khi người dùng xác nhận khi lưu nhập liệu. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_extraction")
    private Map<String, Object> aiExtraction;

    protected Document() {
    }

    public Document(UUID organizationId, UUID facilityId, UUID periodId, DocType docType, String storageKey,
                    String fileName, String mimeType, long sizeBytes, String sha256, UUID uploadedBy) {
        this.organizationId = organizationId;
        this.facilityId = facilityId;
        this.periodId = periodId;
        this.docType = docType;
        this.storageKey = storageKey;
        this.fileName = fileName;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
        this.sha256 = sha256;
        this.uploadedBy = uploadedBy;
    }

    /** Lưu bản nháp AI; nếu chứng từ đang để loại OTHER thì nhận loại AI nhận diện được. */
    public void attachAiDraft(Map<String, Object> extraction, DocType detectedType) {
        this.aiExtraction = extraction;
        if (detectedType != null && this.docType == DocType.OTHER) {
            this.docType = detectedType;
        }
    }

    public void changeDocType(DocType docType) {
        this.docType = docType;
    }

    /** Người dùng đã xác nhận số liệu (lưu nhập liệu): từ đây số liệu được tính vào kiểm kê. */
    public void markEntered(UUID userId) {
        this.status = Status.ENTERED;
        this.enteredBy = userId;
        this.enteredAt = Instant.now();
        this.rejectReason = null;
    }

    public void reject(String reason) {
        this.status = Status.REJECTED;
        this.rejectReason = reason;
    }

    public Map<String, Object> getAiExtraction() {
        return aiExtraction;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getFacilityId() {
        return facilityId;
    }

    public UUID getPeriodId() {
        return periodId;
    }

    public DocType getDocType() {
        return docType;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getFileName() {
        return fileName;
    }

    public String getMimeType() {
        return mimeType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public String getSha256() {
        return sha256;
    }

    public Status getStatus() {
        return status;
    }

    public String getRejectReason() {
        return rejectReason;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public UUID getEnteredBy() {
        return enteredBy;
    }

    public Instant getEnteredAt() {
        return enteredAt;
    }
}

