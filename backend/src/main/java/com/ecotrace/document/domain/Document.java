package com.ecotrace.document.domain;

import com.ecotrace.common.domain.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.Instant;
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

    protected Document() {
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

