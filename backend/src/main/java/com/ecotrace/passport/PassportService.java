package com.ecotrace.passport;

import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.repository.OrganizationRepository;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.passport.domain.Passport;
import com.ecotrace.product.AllocationService;
import com.ecotrace.product.AllocationService.FootprintView;
import com.ecotrace.product.ProductRepository;
import com.ecotrace.product.domain.Product;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Cấp, thu hồi và xác minh công khai hộ chiếu xanh (mục 10). */
@Service
public class PassportService {

    private static final String CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();
    /** Sắp xếp khóa để JSON chuẩn hóa ổn định trước khi băm và ký. */
    private static final ObjectMapper CANONICAL = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);

    private final PassportRepository passports;
    private final OrganizationService organizationService;
    private final OrganizationRepository organizations;
    private final ProductRepository products;
    private final AllocationService allocationService;
    private final SigningService signing;
    private final AuditService audit;
    private final String calcVersion;

    public PassportService(PassportRepository passports, OrganizationService organizationService,
                           OrganizationRepository organizations, ProductRepository products,
                           AllocationService allocationService, SigningService signing, AuditService audit,
                           @Value("${app.calculation.version:0.1.0}") String calcVersion) {
        this.passports = passports;
        this.organizationService = organizationService;
        this.organizations = organizations;
        this.products = products;
        this.allocationService = allocationService;
        this.signing = signing;
        this.audit = audit;
        this.calcVersion = calcVersion;
    }

    /** Hộ chiếu trả cho frontend (trang quản lý). */
    public record PassportView(UUID id, String publicCode, UUID productId, String productName, UUID periodId,
                               String periodName, BigDecimal totalPerUnit, String status, String verificationLevel,
                               Instant issuedAt, Instant revokedAt, String hash) {
    }

    @Transactional(readOnly = true)
    public List<PassportView> listByPeriod(UUID periodId) {
        organizationService.requirePeriod(periodId);
        return passports.findAllByOrganizationIdAndPeriodIdOrderByIssuedAtDesc(TenantContext.organizationId(), periodId)
                .stream().map(PassportService::toView).toList();
    }

    @Transactional
    public PassportView issue(UUID periodId, UUID productId) {
        ReportingPeriod p = organizationService.requirePeriod(periodId);
        if (!p.isLocked()) {
            throw new ApiException(HttpStatus.CONFLICT, "PERIOD_MUST_BE_LOCKED",
                    "Period must be locked before issuing a passport");
        }
        UUID orgId = TenantContext.organizationId();
        Product product = products.findById(productId)
                .filter(x -> x.getOrganizationId().equals(orgId))
                .orElseThrow(() -> ApiException.notFound("product", productId));
        FootprintView fp = allocationService.getFootprints(periodId).stream()
                .filter(f -> f.productId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "FOOTPRINT_NOT_CALCULATED",
                        "Enter production output and calculate the period before issuing a passport"));

        // Số lưu dạng chuỗi cố định để JSON chuẩn hóa không đổi sau khi qua JSONB
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("companyName", organizations.findById(orgId).map(o -> o.getName()).orElse(""));
        payload.put("productName", product.getName());
        payload.put("cnCode", product.getCnCode());
        payload.put("productUnit", product.getUnit());
        payload.put("periodName", p.getName());
        payload.put("periodStart", p.getStartDate().toString());
        payload.put("periodEnd", p.getEndDate().toString());
        payload.put("directPerUnit", fixed(fp.directPerUnit()));
        payload.put("indirectPerUnit", fixed(fp.indirectPerUnit()));
        payload.put("precursorPerUnit", fixed(fp.precursorPerUnit()));
        payload.put("totalPerUnit", fixed(fp.totalPerUnit()));
        payload.put("actualDataShare", fp.actualDataShare() != null ? fp.actualDataShare().setScale(4, RoundingMode.HALF_UP).toPlainString() : "0");
        payload.put("allocationMethod", fp.allocationMethod());
        payload.put("calcVersion", calcVersion);

        String canonical = canonical(payload);
        Passport passport = passports.save(new Passport(orgId, periodId, productId, payload,
                signing.sha256Hex(canonical), signing.sign(canonical), newPublicCode()));
        audit.record(AuditService.ISSUE_PASSPORT, "passport", passport.getId(), null,
                Map.of("publicCode", passport.getPublicCode()));
        return toView(passport);
    }

    @Transactional
    public void revoke(UUID passportId) {
        Passport p = passports.findById(passportId)
                .filter(x -> x.getOrganizationId().equals(TenantContext.organizationId()))
                .orElseThrow(() -> ApiException.notFound("passport", passportId));
        p.revoke();
        audit.record(AuditService.UPDATE, "passport", passportId, null, Map.of("revokedAt", p.getRevokedAt()));
    }

    /** Trang xác minh công khai: nội dung đã ký + kiểm tra lại chữ ký với mã băm hiện tại. */
    @Transactional(readOnly = true)
    public Map<String, Object> verifyPublicCode(String code) {
        Passport p = passports.findByPublicCode(code)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PASSPORT_NOT_FOUND", "Passport not found"));
        String canonical = canonical(p.getPayload());
        boolean hashOk = signing.sha256Hex(canonical).equals(p.getPayloadHash());

        Map<String, Object> res = new LinkedHashMap<>(p.getPayload());
        for (String k : List.of("directPerUnit", "indirectPerUnit", "precursorPerUnit", "totalPerUnit", "actualDataShare")) {
            Object v = res.get(k);
            if (v != null) res.put(k, new BigDecimal(v.toString()));
        }
        res.put("publicCode", p.getPublicCode());
        res.put("status", p.isRevoked() ? "REVOKED" : "VALID");
        res.put("signatureValid", hashOk && signing.verify(canonical, p.getSignature()));
        res.put("verificationLevel", p.getVerification().name());
        res.put("issuedAt", p.getIssuedAt());
        res.put("revokedAt", p.getRevokedAt());
        res.put("hash", p.getPayloadHash());
        res.put("methodologyUrl", null);
        return res;
    }

    private static PassportView toView(Passport p) {
        Map<String, Object> pl = p.getPayload();
        Object total = pl.get("totalPerUnit");
        return new PassportView(p.getId(), p.getPublicCode(), p.getProductId(), String.valueOf(pl.get("productName")),
                p.getPeriodId(), String.valueOf(pl.get("periodName")),
                total != null ? new BigDecimal(total.toString()) : null,
                p.isRevoked() ? "REVOKED" : "VALID", p.getVerification().name(), p.getIssuedAt(), p.getRevokedAt(),
                p.getPayloadHash());
    }

    private static String fixed(BigDecimal v) {
        return v == null ? "0" : v.setScale(6, RoundingMode.HALF_UP).toPlainString();
    }

    private static String canonical(Map<String, Object> payload) {
        try {
            return CANONICAL.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Mã công khai dạng ET-XXXX-XXXX, bỏ các ký tự dễ nhầm (0/O, 1/I). */
    private String newPublicCode() {
        for (int attempt = 0; attempt < 5; attempt++) {
            StringBuilder sb = new StringBuilder("ET-");
            for (int i = 0; i < 8; i++) {
                if (i == 4) sb.append('-');
                sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            }
            String code = sb.toString();
            if (passports.findByPublicCode(code).isEmpty()) return code;
        }
        throw new IllegalStateException("Cannot generate unique public code");
    }
}
