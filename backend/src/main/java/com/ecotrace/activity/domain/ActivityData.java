package com.ecotrace.activity.domain;

import com.ecotrace.common.domain.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/** Dữ liệu hoạt động đã chuẩn hóa đơn vị — bảng activity_data. */
@Entity
@Table(name = "activity_data")
public class ActivityData extends AuditableEntity {

    public enum EntryMethod {
        DOCUMENT,
        IMPORT,
        MANUAL
    }

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "period_id", nullable = false)
    private UUID periodId;

    @Column(name = "facility_id", nullable = false)
    private UUID facilityId;

    @Column(name = "source_document_id")
    private UUID sourceDocumentId;

    @Column(name = "import_batch_id")
    private UUID importBatchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_method", nullable = false, length = 16)
    private EntryMethod entryMethod;

    @Column(name = "created_by")
    private UUID createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ActivityCategory category;

    @Column(name = "sub_category", length = 64)
    private String subCategory;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal quantity;

    @Column(nullable = false, length = 16)
    private String unit;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    @Column(name = "supplier_id")
    private UUID supplierId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> metadata = Map.of();

    protected ActivityData() {
    }

    public ActivityData(UUID organizationId, UUID periodId, UUID facilityId, EntryMethod entryMethod,
                        ActivityCategory category, String subCategory, BigDecimal quantity, String unit,
                        LocalDate activityDate) {
        this.organizationId = organizationId;
        this.periodId = periodId;
        this.facilityId = facilityId;
        this.entryMethod = entryMethod;
        this.category = category;
        this.subCategory = subCategory;
        this.quantity = quantity;
        this.unit = unit;
        this.activityDate = activityDate;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getPeriodId() {
        return periodId;
    }

    public UUID getFacilityId() {
        return facilityId;
    }

    public UUID getSourceDocumentId() {
        return sourceDocumentId;
    }

    public UUID getImportBatchId() {
        return importBatchId;
    }

    public EntryMethod getEntryMethod() {
        return entryMethod;
    }

    public ActivityCategory getCategory() {
        return category;
    }

    public String getSubCategory() {
        return subCategory;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public String getUnit() {
        return unit;
    }

    public LocalDate getActivityDate() {
        return activityDate;
    }

    public UUID getSupplierId() {
        return supplierId;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    /** Gắn chứng từ gốc (bằng chứng), người nhập và dữ liệu gốc của form để truy vết. */
    public ActivityData withEvidence(UUID sourceDocumentId, UUID createdBy, Map<String, Object> metadata) {
        this.sourceDocumentId = sourceDocumentId;
        this.createdBy = createdBy;
        this.metadata = metadata != null ? metadata : Map.of();
        return this;
    }
}

