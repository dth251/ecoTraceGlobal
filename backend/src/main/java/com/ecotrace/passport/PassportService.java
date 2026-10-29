package com.ecotrace.passport;

import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.passport.domain.Passport;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Dịch vụ cấp, thu hồi và kiểm tra hộ chiếu xanh số (mục 10 — Sprint 5). */
@Service
public class PassportService {

    private final PassportRepository passports;
    private final OrganizationService organizationService;

    public PassportService(PassportRepository passports, OrganizationService organizationService) {
        this.passports = passports;
        this.organizationService = organizationService;
    }

    @Transactional(readOnly = true)
    public List<Passport> listByPeriod(UUID periodId) {
        organizationService.requirePeriod(periodId);
        return passports.findAllByOrganizationIdAndPeriodIdOrderByIssuedAtDesc(
                TenantContext.organizationId(), periodId);
    }

    @Transactional
    public Passport issue(UUID periodId, UUID productId) {
        ReportingPeriod p = organizationService.requirePeriod(periodId);
        if (!p.isLocked()) {
            throw new ApiException(HttpStatus.CONFLICT, "PERIOD_MUST_BE_LOCKED",
                    "Period must be locked before issuing a passport");
        }
        throw ApiException.notImplemented("POST /periods/{id}/passports");
    }

    @Transactional
    public void revoke(UUID passportId) {
        throw ApiException.notImplemented("POST /passports/{id}/revoke");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> verifyPublicCode(String code) {
        Passport p = passports.findByPublicCode(code)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PASSPORT_NOT_FOUND", "Passport not found"));
        return Map.of(
                "publicCode", p.getPublicCode(),
                "valid", !p.isRevoked(),
                "revokedAt", p.getRevokedAt() != null ? p.getRevokedAt().toString() : "",
                "issuedAt", p.getIssuedAt(),
                "verification", p.getVerification(),
                "payloadHash", p.getPayloadHash(),
                "payload", p.getPayload()
        );
    }
}

