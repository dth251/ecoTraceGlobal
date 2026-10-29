package com.ecotrace.product.domain;

import com.ecotrace.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Phát thải nhúng CBAM trên mỗi đơn vị sản phẩm trong kỳ — bảng product_footprint. */
@Entity
@Table(name = "product_footprint")
public class ProductFootprint extends BaseEntity {

    @Column(name = "period_id", nullable = false)
    private UUID periodId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "direct_co2e_per_unit", nullable = false, precision = 18, scale = 6)
    private BigDecimal directCo2ePerUnit;

    @Column(name = "indirect_co2e_per_unit", nullable = false, precision = 18, scale = 6)
    private BigDecimal indirectCo2ePerUnit;

    @Column(name = "precursor_co2e_per_unit", nullable = false, precision = 18, scale = 6)
    private BigDecimal precursorCo2ePerUnit;

    @Column(name = "total_co2e_per_unit", nullable = false, precision = 18, scale = 6)
    private BigDecimal totalCo2ePerUnit;

    @Column(name = "actual_data_share", precision = 5, scale = 4)
    private BigDecimal actualDataShare;

    @Column(name = "allocation_method", nullable = false, length = 32)
    private String allocationMethod = "MASS";

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt;

    protected ProductFootprint() {
    }

    public ProductFootprint(UUID periodId, UUID productId) {
        this.periodId = periodId;
        this.productId = productId;
    }

    /** Ghi kết quả phân bổ (kgCO2e trên một đơn vị sản phẩm). */
    public void update(BigDecimal direct, BigDecimal indirect, BigDecimal precursor, BigDecimal actualDataShare,
                       String allocationMethod) {
        this.directCo2ePerUnit = direct;
        this.indirectCo2ePerUnit = indirect;
        this.precursorCo2ePerUnit = precursor;
        this.totalCo2ePerUnit = direct.add(indirect).add(precursor);
        this.actualDataShare = actualDataShare;
        this.allocationMethod = allocationMethod;
        this.calculatedAt = Instant.now();
    }

    @PrePersist
    void onCalc() {
        if (calculatedAt == null) calculatedAt = Instant.now();
    }

    public UUID getPeriodId() {
        return periodId;
    }

    public UUID getProductId() {
        return productId;
    }

    public BigDecimal getDirectCo2ePerUnit() {
        return directCo2ePerUnit;
    }

    public BigDecimal getIndirectCo2ePerUnit() {
        return indirectCo2ePerUnit;
    }

    public BigDecimal getPrecursorCo2ePerUnit() {
        return precursorCo2ePerUnit;
    }

    public BigDecimal getTotalCo2ePerUnit() {
        return totalCo2ePerUnit;
    }

    public BigDecimal getActualDataShare() {
        return actualDataShare;
    }

    public String getAllocationMethod() {
        return allocationMethod;
    }

    public Instant getCalculatedAt() {
        return calculatedAt;
    }
}

