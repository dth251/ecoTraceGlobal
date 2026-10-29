package com.ecotrace.calculation.domain;

import com.ecotrace.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Kết quả tính phát thải cho từng dòng hoạt động — bảng emission_record. */
@Entity
@Table(name = "emission_record")
public class EmissionRecord extends BaseEntity {

    @Column(name = "activity_data_id", nullable = false)
    private UUID activityDataId;

    @Column(name = "emission_factor_id", nullable = false)
    private UUID emissionFactorId;

    @Column(nullable = false)
    private short scope;

    @Column(name = "scope3_category")
    private Short scope3Category;

    @Column(name = "co2e_kg", nullable = false, precision = 18, scale = 6)
    private BigDecimal co2eKg;

    @Column(nullable = false, length = 32)
    private String method;

    @Column(name = "calc_version", nullable = false, length = 16)
    private String calcVersion;

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt;

    protected EmissionRecord() {
    }

    public EmissionRecord(UUID activityDataId, UUID emissionFactorId, short scope, Short scope3Category,
                          BigDecimal co2eKg, String method, String calcVersion) {
        this.activityDataId = activityDataId;
        this.emissionFactorId = emissionFactorId;
        this.scope = scope;
        this.scope3Category = scope3Category;
        this.co2eKg = co2eKg;
        this.method = method;
        this.calcVersion = calcVersion;
    }

    @PrePersist
    void onCalc() {
        if (calculatedAt == null) calculatedAt = Instant.now();
    }

    public UUID getActivityDataId() {
        return activityDataId;
    }

    public UUID getEmissionFactorId() {
        return emissionFactorId;
    }

    public short getScope() {
        return scope;
    }

    public Short getScope3Category() {
        return scope3Category;
    }

    public BigDecimal getCo2eKg() {
        return co2eKg;
    }

    public String getMethod() {
        return method;
    }

    public String getCalcVersion() {
        return calcVersion;
    }

    public Instant getCalculatedAt() {
        return calculatedAt;
    }
}

