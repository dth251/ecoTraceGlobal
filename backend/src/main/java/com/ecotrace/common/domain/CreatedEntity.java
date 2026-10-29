package com.ecotrace.common.domain;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;

import java.time.Instant;

/** Entity có cột created_at. */
@MappedSuperclass
public abstract class CreatedEntity extends BaseEntity {

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        beforeInsert();
    }

    /** Hook cho lớp con, chạy ngay trước khi INSERT. */
    protected void beforeInsert() {
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

