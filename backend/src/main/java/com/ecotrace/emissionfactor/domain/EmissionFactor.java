package com.ecotrace.emissionfactor.domain;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.common.domain.CreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Kho hệ số phát thải có phiên bản và nguồn — bảng emission_factor. */
@Entity
@Table(name = "emission_factor")
public class EmissionFactor extends CreatedEntity {

    @Column(nullable = false, length = 64)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ActivityCategory category;

    @Column(name = "sub_category", length = 64)
    private String subCategory;

    @Column(nullable = false, length = 16)
    private String region = "GLOBAL";

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal value;

    @Column(name = "unit_numerator", nullable = false, length = 16)
    private String unitNumerator;

    @Column(name = "unit_denominator", nullable = false, length = 16)
    private String unitDenominator;

    @Column(nullable = false, length = 16)
    private String gas = "CO2e";

    @Column(nullable = false)
    private String source;

    @Column(name = "source_year", nullable = false)
    private int sourceYear;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(nullable = false)
    private int version = 1;

    protected EmissionFactor() {
    }

    public EmissionFactor(String code, ActivityCategory category, String subCategory, String region,
                          BigDecimal value, String unitNumerator, String unitDenominator,
                          String source, int sourceYear, LocalDate validFrom, LocalDate validTo, int version) {
        this.code = code;
        this.category = category;
        this.subCategory = subCategory;
        this.region = region;
        this.value = value;
        this.unitNumerator = unitNumerator;
        this.unitDenominator = unitDenominator;
        this.source = source;
        this.sourceYear = sourceYear;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.version = version;
    }

    public String getCode() {
        return code;
    }

    public ActivityCategory getCategory() {
        return category;
    }

    public String getSubCategory() {
        return subCategory;
    }

    public String getRegion() {
        return region;
    }

    public BigDecimal getValue() {
        return value;
    }

    public String getUnitNumerator() {
        return unitNumerator;
    }

    public String getUnitDenominator() {
        return unitDenominator;
    }

    public String getGas() {
        return gas;
    }

    public String getSource() {
        return source;
    }

    public int getSourceYear() {
        return sourceYear;
    }

    public LocalDate getValidFrom() {
        return validFrom;
    }

    public LocalDate getValidTo() {
        return validTo;
    }

    public int getVersion() {
        return version;
    }
}

