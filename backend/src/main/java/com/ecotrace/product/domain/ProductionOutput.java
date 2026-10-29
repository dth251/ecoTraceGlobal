package com.ecotrace.product.domain;

import com.ecotrace.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

/** Sản lượng từng sản phẩm trong kỳ — bảng production_output. */
@Entity
@Table(name = "production_output")
public class ProductionOutput extends BaseEntity {

    @Column(name = "period_id", nullable = false)
    private UUID periodId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal quantity;

    @Column(nullable = false, length = 16)
    private String unit = "t";

    protected ProductionOutput() {
    }

    public ProductionOutput(UUID periodId, UUID productId, BigDecimal quantity, String unit) {
        this.periodId = periodId;
        this.productId = productId;
        this.quantity = quantity;
        if (unit != null && !unit.isBlank()) this.unit = unit;
    }

    public UUID getPeriodId() {
        return periodId;
    }

    public UUID getProductId() {
        return productId;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public String getUnit() {
        return unit;
    }

    public void update(BigDecimal quantity, String unit) {
        this.quantity = quantity;
        if (unit != null && !unit.isBlank()) this.unit = unit;
    }
}

