package com.ecotrace.common.domain;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PreUpdate;

import java.time.Instant;

/** Entity có cả created_at và updated_at. */
@MappedSuperclass
public abstract class AuditableEntity extends CreatedEntity {

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Override
    protected void beforeInsert() {
        updatedAt = Instant.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
