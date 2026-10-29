package com.ecotrace.optimizer.domain;

import com.ecotrace.common.domain.CreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/** Kịch bản giảm phát thải đã mô phỏng — bảng scenario (mục 6.3, 9.3). */
@Entity
@Table(name = "scenario")
public class Scenario extends CreatedEntity {

    public enum Type {
        SOLAR_ROOFTOP,
        FUEL_SWITCH,
        SUPPLIER_SWITCH,
        TRANSPORT_MODE_SHIFT,
        ENERGY_EFFICIENCY
    }

    public enum CreatedBy {
        USER,
        SYSTEM
    }

    @Column(name = "period_id", nullable = false)
    private UUID periodId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Type type;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> parameters = Map.of();

    @Column(name = "baseline_co2e", nullable = false, precision = 18, scale = 6)
    private BigDecimal baselineCo2e;

    @Column(name = "projected_co2e", nullable = false, precision = 18, scale = 6)
    private BigDecimal projectedCo2e;

    @Column(name = "cost_delta_usd", precision = 18, scale = 2)
    private BigDecimal costDeltaUsd;

    @Column(name = "payback_years", precision = 6, scale = 2)
    private BigDecimal paybackYears;

    @Enumerated(EnumType.STRING)
    @Column(name = "created_by", nullable = false, length = 8)
    private CreatedBy createdBy;

    protected Scenario() {
    }

    public Scenario(UUID periodId, Type type, Map<String, Object> parameters,
                    BigDecimal baselineCo2e, BigDecimal projectedCo2e,
                    BigDecimal costDeltaUsd, BigDecimal paybackYears, CreatedBy createdBy) {
        this.periodId = periodId;
        this.type = type;
        this.parameters = parameters;
        this.baselineCo2e = baselineCo2e;
        this.projectedCo2e = projectedCo2e;
        this.costDeltaUsd = costDeltaUsd;
        this.paybackYears = paybackYears;
        this.createdBy = createdBy;
    }

    public UUID getPeriodId() {
        return periodId;
    }

    public Type getType() {
        return type;
    }

    public Map<String, Object> getParameters() {
        return parameters;
    }

    public BigDecimal getBaselineCo2e() {
        return baselineCo2e;
    }

    public BigDecimal getProjectedCo2e() {
        return projectedCo2e;
    }

    public BigDecimal getCostDeltaUsd() {
        return costDeltaUsd;
    }

    public BigDecimal getPaybackYears() {
        return paybackYears;
    }

    public CreatedBy getCreatedBy() {
        return createdBy;
    }
}

