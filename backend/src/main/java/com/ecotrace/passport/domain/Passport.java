package com.ecotrace.passport.domain;

import com.ecotrace.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Hộ chiếu xanh số đã cấp — bảng passport (mục 6.3, 10). */
@Entity
@Table(name = "passport")
public class Passport extends BaseEntity {

    public enum Verification {
        SELF_DECLARED,
        VERIFIED
    }

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "period_id", nullable = false)
    private UUID periodId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> payload;

    @Column(name = "payload_hash", nullable = false, length = 64, columnDefinition = "CHAR(64)")
    private String payloadHash;

    @Column(nullable = false)
    private String signature;

    @Column(name = "public_code", nullable = false, unique = true, length = 16)
    private String publicCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Verification verification = Verification.SELF_DECLARED;

    @Column(name = "verifier_name", length = 255)
    private String verifierName;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected Passport() {
    }

    public Passport(UUID organizationId, UUID periodId, UUID productId, Map<String, Object> payload,
                    String payloadHash, String signature, String publicCode, Verification verification) {
        this.organizationId = organizationId;
        this.periodId = periodId;
        this.productId = productId;
        this.payload = payload;
        this.payloadHash = payloadHash;
        this.signature = signature;
        this.publicCode = publicCode;
        this.verification = verification;
    }

    public void revoke() {
        if (revokedAt == null) {
            revokedAt = Instant.now();
        }
    }

    @PrePersist
    void onIssue() {
        if (issuedAt == null) issuedAt = Instant.now();
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getPeriodId() {
        return periodId;
    }

    public UUID getProductId() {
        return productId;
    }

    public Map<String, Object> getPayload() {
        return payload;
    }

    public String getPayloadHash() {
        return payloadHash;
    }

    public String getSignature() {
        return signature;
    }

    public String getPublicCode() {
        return publicCode;
    }

    public Verification getVerification() {
        return verification;
    }

    public String getVerifierName() {
        return verifierName;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }
}

