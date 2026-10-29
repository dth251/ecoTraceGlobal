package com.ecotrace.passport;

import com.ecotrace.activity.ActivityRepository;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.EmissionRecordRepository;
import com.ecotrace.calculation.domain.EmissionRecord;
import com.ecotrace.product.AllocationService;
import com.ecotrace.ai.AiServiceClient;
import com.ecotrace.ai.dto.AiDtos.PassportReadinessRequest;
import com.ecotrace.ai.dto.AiDtos.PassportReadinessResponse;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.document.DocumentRepository;
import com.ecotrace.document.domain.Document;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.repository.ReportingPeriodRepository;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.passport.domain.Passport;
import com.ecotrace.product.ProductFootprintRepository;
import com.ecotrace.product.ProductRepository;
import com.ecotrace.product.ProductionOutputRepository;
import com.ecotrace.product.domain.Product;
import com.ecotrace.product.domain.ProductFootprint;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.List;
import java.util.UUID;

/**
 * Xét điều kiện cấp hộ chiếu xanh. Backend chỉ dựng ảnh chụp dữ liệu từ database, AI service quyết định theo bộ điều kiện.
 * Số liệu backend chưa tính được (chưa cài đặt tính phát thải, truy vết...) gửi null và được tính là chưa đạt:
 * không có bằng chứng thì không cấp.
 */
@Service
public class PassportReadinessService {

    /** Chương CN (EU CBAM) có tiền chất: sắt thép 72, 73 và nhôm 76. */
    private static final List<String> PRECURSOR_CN_CHAPTERS = List.of("72", "73", "76");

    private final OrganizationService organizationService;
    private final ReportingPeriodRepository periods;
    private final DocumentRepository documents;
    private final ActivityRepository activities;
    private final ProductRepository products;
    private final ProductFootprintRepository footprints;
    private final ProductionOutputRepository outputs;
    private final PassportRepository passports;
    private final AiServiceClient ai;
    private final SigningService signing;
    private final EmissionRecordRepository records;
    private final AllocationService allocation;

    public PassportReadinessService(OrganizationService organizationService, ReportingPeriodRepository periods,
                                    DocumentRepository documents, ActivityRepository activities, ProductRepository products,
                                    ProductFootprintRepository footprints, ProductionOutputRepository outputs,
                                    PassportRepository passports, AiServiceClient ai, SigningService signing,
                                    EmissionRecordRepository records, AllocationService allocation) {
        this.organizationService = organizationService;
        this.periods = periods;
        this.documents = documents;
        this.activities = activities;
        this.products = products;
        this.footprints = footprints;
        this.outputs = outputs;
        this.passports = passports;
        this.ai = ai;
        this.signing = signing;
        this.records = records;
        this.allocation = allocation;
    }

    /** Trước khi cấp: xét kỳ và sản phẩm của người dùng đang đăng nhập. */
    @Transactional(readOnly = true)
    public PassportReadinessResponse check(UUID periodId, UUID productId, String language) {
        ReportingPeriod period = organizationService.requirePeriod(periodId);
        UUID orgId = TenantContext.organizationId();
        Product product = products.findById(productId)
                .filter(p -> orgId.equals(p.getOrganizationId()))
                .orElseThrow(() -> ApiException.notFound("Product", productId));
        return ai.passportReadiness(snapshot(period, orgId, product, "PRE_ISSUE", null, language));
    }

    /** Hộ chiếu đã cấp: dùng cho trang xác minh công khai, không cần đăng nhập. */
    @Transactional(readOnly = true)
    public PassportReadinessResponse audit(String publicCode, String language) {
        Passport passport = passports.findByPublicCode(publicCode)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PASSPORT_NOT_FOUND", "Passport not found"));
        ReportingPeriod period = periods.findById(passport.getPeriodId())
                .orElseThrow(() -> ApiException.notFound("ReportingPeriod", passport.getPeriodId()));
        Product product = products.findById(passport.getProductId())
                .orElseThrow(() -> ApiException.notFound("Product", passport.getProductId()));
        return ai.passportReadiness(snapshot(period, passport.getOrganizationId(), product, "ISSUED", passport, language));
    }

    private PassportReadinessRequest snapshot(ReportingPeriod period, UUID orgId, Product product, String stage,
                                              Passport passport, String language) {
        UUID periodId = period.getId();
        int pending = documents.findAllByOrganizationIdAndPeriodIdAndStatusOrderByCreatedAtDesc(
                orgId, periodId, Document.Status.PENDING_ENTRY).size();
        int rejected = documents.findAllByOrganizationIdAndPeriodIdAndStatusOrderByCreatedAtDesc(
                orgId, periodId, Document.Status.REJECTED).size();
        List<ActivityData> acts = activities.findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(orgId, periodId);
        Map<UUID, ActivityData> byId = acts.stream().collect(Collectors.toMap(ActivityData::getId, Function.identity()));
        List<EmissionRecord> recs = acts.isEmpty() ? List.of() : records.findAllByActivityDataIdIn(byId.keySet());
        Set<UUID> calculated = recs.stream().map(EmissionRecord::getActivityDataId).collect(Collectors.toSet());
        int withoutFactor = (int) acts.stream().filter(x -> !calculated.contains(x.getId())).count();

        // Tháng đủ dữ liệu: có Scope 2 (điện), và có Scope 1 nếu kỳ có dùng nhiên liệu
        boolean usesFuel = recs.stream().anyMatch(r -> r.getScope() == 1);
        Map<YearMonth, Set<Short>> scopesByMonth = new HashMap<>();
        for (EmissionRecord r : recs) {
            scopesByMonth.computeIfAbsent(YearMonth.from(byId.get(r.getActivityDataId()).getActivityDate()), k -> new HashSet<>())
                    .add(r.getScope());
        }
        int months = (int) ChronoUnit.MONTHS.between(period.getStartDate().withDayOfMonth(1),
                period.getEndDate().withDayOfMonth(1)) + 1;
        int covered = 0;
        for (YearMonth m = YearMonth.from(period.getStartDate()); !m.isAfter(YearMonth.from(period.getEndDate())); m = m.plusMonths(1)) {
            Set<Short> sc = scopesByMonth.getOrDefault(m, Set.of());
            if (sc.contains((short) 2) && (!usesFuel || sc.contains((short) 1))) covered++;
        }

        AllocationService.PeriodTotals totals = allocation.totals(orgId, periodId);
        ProductFootprint footprint = footprints.findByPeriodIdAndProductId(periodId, product.getId()).orElse(null);
        String cn = product.getCnCode();
        boolean precursorsRequired = cn != null && PRECURSOR_CN_CHAPTERS.stream().anyMatch(cn::startsWith);

        int unconfirmedAi = (int) documents.findAllByOrganizationIdAndPeriodIdAndStatusOrderByCreatedAtDesc(
                orgId, periodId, Document.Status.PENDING_ENTRY).stream().filter(d -> d.getAiExtraction() != null).count();
        int withoutSource = (int) acts.stream().filter(x -> x.getSourceDocumentId() == null && x.getImportBatchId() == null).count();

        Double allocationError = null;
        if (footprint != null && totals.embeddedKg().signum() > 0) {
            BigDecimal allocated = BigDecimal.ZERO;
            for (ProductFootprint fp : footprints.findAllByPeriodId(periodId)) {
                var out = outputs.findByPeriodIdAndProductId(periodId, fp.getProductId()).orElse(null);
                if (out != null) allocated = allocated.add(fp.getTotalCo2ePerUnit().multiply(out.getQuantity()));
            }
            allocationError = allocated.subtract(totals.embeddedKg()).abs()
                    .multiply(BigDecimal.valueOf(100)).divide(totals.embeddedKg(), 4, RoundingMode.HALF_UP).doubleValue();
        }

        boolean issued = passport != null;
        return new PassportReadinessRequest(
                period.isLocked(), pending, rejected, acts.size(), withoutFactor, months, covered,
                precursorsRequired, precursorsRequired ? totals.precursorKg().signum() > 0 : null,
                totals.actualDataShare() != null ? totals.actualDataShare().doubleValue() : null,
                unconfirmedAi, withoutSource,
                outputs.existsByPeriodIdAndProductId(periodId, product.getId()),
                footprint != null ? footprint.getAllocationMethod() : null,
                allocationError,
                anomalies(period, acts),
                stage,
                issued ? passportSignatureValid(passport) : null,
                issued && passport.isRevoked(),
                issued ? passport.getVerification().name() : Passport.Verification.SELF_DECLARED.name(),
                issued ? passport.getVerifierName() : null,
                language != null ? language : "vi");
    }

    /**
     * Bất thường cần giải trình: hoạt động có ngày ngoài kỳ, và hoạt động trùng nhau
     * (cùng hạng mục, loại, ngày, số lượng — thường do nhập một chứng từ hai lần).
     */
    static int anomalies(ReportingPeriod period, List<ActivityData> acts) {
        int outside = (int) acts.stream().filter(a -> a.getActivityDate().isBefore(period.getStartDate())
                || a.getActivityDate().isAfter(period.getEndDate())).count();
        Set<String> seen = new HashSet<>();
        int duplicates = 0;
        for (ActivityData a : acts) {
            String key = a.getCategory() + "|" + a.getSubCategory() + "|" + a.getActivityDate() + "|"
                    + a.getQuantity().stripTrailingZeros().toPlainString();
            if (!seen.add(key)) duplicates++;
        }
        return outside + duplicates;
    }

    private Boolean passportSignatureValid(Passport passport) {
        return signing.verify(SigningService.canonicalJson(passport.getPayload()), passport.getSignature())
                && signing.sha256Hex(SigningService.canonicalJson(passport.getPayload())).equals(passport.getPayloadHash().trim());
    }
}
