package com.ecotrace.product.domain;

import com.ecotrace.common.domain.CreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

/** Sản phẩm, mã hàng của doanh nghiệp — bảng product. */
@Entity
@Table(name = "product")
public class Product extends CreatedEntity {

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "hs_code", length = 16)
    private String hsCode;

    @Column(name = "cn_code", length = 16)
    private String cnCode;

    @Column(nullable = false, length = 16)
    private String unit = "t";

    protected Product() {
    }

    public Product(UUID organizationId, String name, String hsCode, String cnCode, String unit) {
        this.organizationId = organizationId;
        this.name = name;
        this.hsCode = hsCode;
        this.cnCode = cnCode;
        if (unit != null && !unit.isBlank()) this.unit = unit;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getHsCode() {
        return hsCode;
    }

    public void setHsCode(String hsCode) {
        this.hsCode = hsCode;
    }

    public String getCnCode() {
        return cnCode;
    }

    public void setCnCode(String cnCode) {
        this.cnCode = cnCode;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }
}

