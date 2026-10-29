package com.ecotrace.organization.domain;

import com.ecotrace.common.domain.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

/** Nhà máy, chi nhánh của doanh nghiệp — bảng facility. */
@Entity
@Table(name = "facility")
public class Facility extends AuditableEntity {

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column
    private String address;

    @Column(nullable = false, length = 2, columnDefinition = "CHAR(2)")
    private String country = "VN";

    @Column(name = "grid_region", nullable = false, length = 32)
    private String gridRegion = "VN";

    protected Facility() {
    }

    public Facility(UUID organizationId, String name, String address, String country, String gridRegion) {
        this.organizationId = organizationId;
        this.name = name;
        this.address = address;
        if (country != null && !country.isBlank()) this.country = country.toUpperCase();
        if (gridRegion != null && !gridRegion.isBlank()) this.gridRegion = gridRegion;
        else this.gridRegion = this.country;
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

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getGridRegion() {
        return gridRegion;
    }

    public void setGridRegion(String gridRegion) {
        this.gridRegion = gridRegion;
    }
}

