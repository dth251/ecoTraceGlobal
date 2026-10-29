package com.ecotrace.organization.domain;

import com.ecotrace.common.domain.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Doanh nghiệp khách hàng (tenant) — bảng organization. */
@Entity
@Table(name = "organization")
public class Organization extends AuditableEntity {

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "tax_code", length = 32)
    private String taxCode;

    @Column(nullable = false, length = 2, columnDefinition = "CHAR(2)")
    private String country = "VN";

    @Column(nullable = false, length = 32)
    private String plan = "TRIAL";

    protected Organization() {
    }

    public Organization(String name, String taxCode) {
        this.name = name;
        this.taxCode = taxCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTaxCode() {
        return taxCode;
    }

    public void setTaxCode(String taxCode) {
        this.taxCode = taxCode;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getPlan() {
        return plan;
    }
}

