package com.ecotrace.passport;

import com.ecotrace.ai.dto.AiDtos.PassportReadinessResponse;
import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.repository.OrganizationRepository;
import com.ecotrace.organization.repository.ReportingPeriodRepository;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.passport.domain.Passport;
import com.ecotrace.product.ProductFootprintRepository;
import com.ecotrace.product.ProductRepository;
import com.ecotrace.product.domain.Product;
import com.ecotrace.product.domain.ProductFootprint;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Dịch vụ cấp, thu hồi và kiểm tra hộ chiếu xanh số (mục 10 — Sprint 5). */
@Service
public class PassportService {

    private static final String CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // bỏ 0/O, 1/I dễ nhầm
    private static final SecureRandom RANDOM = new SecureRandom();

    /** Hộ chiếu trả cho frontend (khớp Passport ở frontend/src/types/domain.ts). */
    public record PassportView(UUID id, String publicCode, UUID productId, String productName, UUID periodId,
                               String periodName, BigDecimal totalPerUnit, String status, String verificationLevel,
                               Instant issuedAt, Instant revokedAt, String hash) {
    }

    private final PassportRepository passports;
    private final OrganizationService organizationService;
    private final PassportReadinessService readinessService;
    private final SigningService signing;
    private final ProductRepository products;
    private final ProductFootprintRepository footprints;
    private final ReportingPeriodRepository periods;
    private final OrganizationRepository organizations;
    private final AuditService audit;

    /** Dùng cho test chốt chặn cấp hộ chiếu. */
    public PassportService(PassportRepository passports, OrganizationService organizationService,
                           PassportReadinessService readinessService) {
        this(passports, organizationService, readinessService, null, null, null, null, null, null);
    }

    @Autowired
    public PassportService(PassportRepository passports, OrganizationService organizationService,
                           PassportReadinessService readinessService, SigningService signing, ProductRepository products,
                           ProductFootprintRepository footprints, ReportingPeriodRepository periods,
                           OrganizationRepository organizations, AuditService audit) {
        this.passports = passports;
        this.organizationService = organizationService;
        this.readinessService = readinessService;
        this.signing = signing;
        this.products = products;
        this.footprints = footprints;
        this.periods = periods;
        this.organizations = organizations;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<PassportView> listByPeriod(UUID periodId) {
        organizationService.requirePeriod(periodId);
        return passports.findAllByOrganizationIdAndPeriodIdOrderByIssuedAtDesc(TenantContext.organizationId(), periodId)
                .stream().map(this::view).toList();
    }

    /**
     * Cấp hộ chiếu: kỳ phải khóa và qua bộ điều kiện (AI service). Chưa có thẩm định độc lập nên mức cao nhất
     * cấp được là tự khai báo (cấp tạm). Payload được chuẩn hóa JSON, băm SHA-256 và ký ECDSA P-256.
     */
    @Transactional
    public PassportView issue(UUID periodId, UUID productId) {
        ReportingPeriod p = organizationService.requirePeriod(periodId);
        if (!p.isLocked()) {
            throw new ApiException(HttpStatus.CONFLICT, "PERIOD_MUST_BE_LOCKED",
                    "Period must be locked before issuing a passport");
        }
        PassportReadinessResponse readiness = readinessService.check(periodId, productId, "vi");
        if (!readiness.canIssue()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PASSPORT_NOT_READY",
                    "Passport requirements are not met", readiness);
        }
        UUID orgId = TenantContext.organizationId();
        Product product = products.findById(productId).filter(x -> orgId.equals(x.getOrganizationId()))
                .orElseThrow(() -> ApiException.notFound("Product", productId));
        ProductFootprint fp = footprints.findByPeriodIdAndProductId(periodId, productId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "FOOTPRINT_MISSING",
                        "Product footprint has not been allocated"));

        String code = newPublicCode();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("schemaVersion", 1);
        payload.put("publicCode", code);
        payload.put("companyName", organizations.findById(orgId).map(o -> o.getName()).orElse(""));
        payload.put("productName", product.getName());
        payload.put("cnCode", product.getCnCode());
        payload.put("hsCode", product.getHsCode());
        payload.put("unit", product.getUnit());
        payload.put("periodName", p.getName());
        payload.put("periodStart", p.getStartDate().toString());
        payload.put("periodEnd", p.getEndDate().toString());
        payload.put("directPerUnit", fp.getDirectCo2ePerUnit());
        payload.put("indirectPerUnit", fp.getIndirectCo2ePerUnit());
        payload.put("precursorPerUnit", fp.getPrecursorCo2ePerUnit());
        payload.put("totalPerUnit", fp.getTotalCo2ePerUnit());
        payload.put("actualDataShare", fp.getActualDataShare());
        payload.put("allocationMethod", fp.getAllocationMethod());
        payload.put("verificationLevel", Passport.Verification.SELF_DECLARED.name());
        payload.put("readinessDecision", readiness.decision());
        payload.put("readinessScore", readiness.score());
        payload.put("methodology", "GHG Protocol; phát thải nhúng theo EU CBAM (trực tiếp, gián tiếp, tiền chất); "
                + "hệ số tham khảo của bản demo");
        payload.put("issuedAt", Instant.now().toString());

        Map<String, Object> normalized = SigningService.normalize(payload);
        String canonical = SigningService.canonicalJson(normalized);
        Passport passport = passports.save(new Passport(orgId, periodId, productId, normalized, signing.sha256Hex(canonical),
                signing.sign(canonical), code, Passport.Verification.SELF_DECLARED));
        audit.record(AuditService.ISSUE_PASSPORT, "passport", passport.getId(), null,
                Map.of("publicCode", code, "decision", readiness.decision(), "score", readiness.score()));
        return view(passport);
    }

    @Transactional(readOnly = true)
    public PassportReadinessResponse readiness(UUID periodId, UUID productId, String language) {
        return readinessService.check(periodId, productId, language);
    }

    @Transactional
    public void revoke(UUID passportId) {
        Passport p = passports.findById(passportId)
                .filter(x -> TenantContext.organizationId().equals(x.getOrganizationId()))
                .orElseThrow(() -> ApiException.notFound("Passport", passportId));
        p.revoke();
        audit.record(AuditService.UPDATE, "passport", p.getId(), null, Map.of("revokedAt", p.getRevokedAt().toString()));
    }

    /** Trang xác minh công khai (khớp PublicVerification ở frontend). Chữ ký được kiểm tra lại mỗi lần xem. */
    @Transactional(readOnly = true)
    public Map<String, Object> verifyPublicCode(String code) {
        Passport p = passports.findByPublicCode(code)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PASSPORT_NOT_FOUND", "Passport not found"));
        Map<String, Object> d = p.getPayload();
        String canonical = SigningService.canonicalJson(d);
        boolean signatureValid = signing.verify(canonical, p.getSignature())
                && signing.sha256Hex(canonical).equals(p.getPayloadHash().trim());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("publicCode", p.getPublicCode());
        out.put("status", p.isRevoked() ? "REVOKED" : "VALID");
        out.put("signatureValid", signatureValid);
        out.put("companyName", d.get("companyName"));
        out.put("productName", d.get("productName"));
        out.put("cnCode", d.get("cnCode"));
        out.put("periodName", d.get("periodName"));
        out.put("directPerUnit", d.get("directPerUnit"));
        out.put("indirectPerUnit", d.get("indirectPerUnit"));
        out.put("precursorPerUnit", d.get("precursorPerUnit"));
        out.put("totalPerUnit", d.get("totalPerUnit"));
        out.put("actualDataShare", d.get("actualDataShare"));
        out.put("verificationLevel", p.getVerification().name());
        out.put("issuedAt", p.getIssuedAt());
        out.put("revokedAt", p.getRevokedAt());
        out.put("hash", p.getPayloadHash());
        out.put("methodologyUrl", null);
        return out;
    }

    private PassportView view(Passport p) {
        Map<String, Object> d = p.getPayload();
        Object total = d.get("totalPerUnit");
        return new PassportView(p.getId(), p.getPublicCode(), p.getProductId(), String.valueOf(d.get("productName")),
                p.getPeriodId(), String.valueOf(d.get("periodName")),
                total == null ? null : new BigDecimal(total.toString()), p.isRevoked() ? "REVOKED" : "VALID",
                p.getVerification().name(), p.getIssuedAt(), p.getRevokedAt(), p.getPayloadHash());
    }

    private String newPublicCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder("ET-");
            for (int i = 0; i < 8; i++) {
                if (i == 4) sb.append('-');
                sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            }
            if (passports.findByPublicCode(sb.toString()).isEmpty()) return sb.toString();
        }
        throw new IllegalStateException("Cannot generate a unique passport code");
    }
}
