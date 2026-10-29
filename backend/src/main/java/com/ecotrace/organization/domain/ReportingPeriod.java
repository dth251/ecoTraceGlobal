package com.ecotrace.organization.domain;

import com.ecotrace.common.domain.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Kỳ báo cáo (quý, năm) của một nhà máy — bảng reporting_period. */
@Entity
@Table(name = "reporting_period")
public class ReportingPeriod extends AuditableEntity {

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "facility_id", nullable = false)
    private UUID facilityId;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PeriodStatus status = PeriodStatus.OPEN;

    @Column(name = "locked_at")
    private Instant lockedAt;

    @Column(name = "locked_by")
    private UUID lockedBy;

    protected ReportingPeriod() {
    }

    public ReportingPeriod(UUID organizationId, UUID facilityId, String name, LocalDate startDate, LocalDate endDate) {
        this.organizationId = organizationId;
        this.facilityId = facilityId;
        this.name = name;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public void lock(UUID userId) {
        this.status = PeriodStatus.LOCKED;
        this.lockedAt = Instant.now();
        this.lockedBy = userId;
    }

    public void unlock() {
        this.status = PeriodStatus.OPEN;
        this.lockedAt = null;
        this.lockedBy = null;
    }

    public boolean isLocked() {
        return status == PeriodStatus.LOCKED;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getFacilityId() {
        return facilityId;
    }

    public String getName() {
        return name;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public PeriodStatus getStatus() {
        return status;
    }

    public Instant getLockedAt() {
        return lockedAt;
    }

    public UUID getLockedBy() {
        return lockedBy;
    }
}

