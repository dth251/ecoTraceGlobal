package com.ecotrace.activity.domain;

import com.ecotrace.common.domain.CreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

/** Nhà cung cấp nguyên liệu — bảng supplier. */
@Entity
@Table(name = "supplier")
public class Supplier extends CreatedEntity {

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 2, columnDefinition = "CHAR(2)")
    private String country;

    @Column(length = 128)
    private String material;

    protected Supplier() {
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getName() {
        return name;
    }

    public String getCountry() {
        return country;
    }

    public String getMaterial() {
        return material;
    }
}

