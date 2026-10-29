package com.ecotrace.importer.domain;

import com.ecotrace.common.domain.CreatedEntity;
import com.ecotrace.importer.template.TemplateType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Một lần nhập file Excel mẫu — bảng import_batch. */
@Entity
@Table(name = "import_batch")
public class ImportBatch extends CreatedEntity {

    public enum Status {
        VALIDATED,
        COMMITTED,
        CANCELLED
    }

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "period_id", nullable = false)
    private UUID periodId;

    @Enumerated(EnumType.STRING)
    @Column(name = "template_type", nullable = false, length = 32)
    private TemplateType templateType;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "storage_key", nullable = false, length = 512)
    private String storageKey;

    @Column(name = "total_rows", nullable = false)
    private int totalRows;

    @Column(name = "valid_rows", nullable = false)
    private int validRows;

    @Column(name = "error_rows", nullable = false)
    private int errorRows;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private List<Map<String, Object>> errors = List.of();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.VALIDATED;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "committed_at")
    private Instant committedAt;

    protected ImportBatch() {
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getPeriodId() {
        return periodId;
    }

    public TemplateType getTemplateType() {
        return templateType;
    }

    public String getFileName() {
        return fileName;
    }

    public int getTotalRows() {
        return totalRows;
    }

    public int getValidRows() {
        return validRows;
    }

    public int getErrorRows() {
        return errorRows;
    }

    public List<Map<String, Object>> getErrors() {
        return errors;
    }

    public Status getStatus() {
        return status;
    }

    public Instant getCommittedAt() {
        return committedAt;
    }
}

