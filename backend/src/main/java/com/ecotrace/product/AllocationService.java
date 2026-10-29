package com.ecotrace.product;

import com.ecotrace.activity.ActivityRepository;
import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.EmissionRecordRepository;
import com.ecotrace.calculation.domain.EmissionRecord;
import com.ecotrace.common.util.UnitConverter;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.product.domain.ProductFootprint;
import com.ecotrace.product.domain.ProductionOutput;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Phân bổ phát thải nhà máy về từng sản phẩm theo khối lượng (MASS) hoặc giờ máy (mục 8.2 — Sprint 4).
 * Phát thải nhúng theo EU CBAM: trực tiếp (Scope 1), gián tiếp (Scope 2) và tiền chất (Scope 3 hạng mục 1,
 * nguyên liệu mua vào). Vận chuyển (Scope 3 hạng mục 4, 9) không thuộc phát thải nhúng nên không phân bổ.
 */
@Service
public class AllocationService {

    private static final BigDecimal THOUSAND = new BigDecimal("1000");

    /** Tổng phát thải trong phạm vi phát thải nhúng của kỳ và tỷ lệ dữ liệu thực tế. */
    public record PeriodTotals(BigDecimal directKg, BigDecimal indirectKg, BigDecimal precursorKg, BigDecimal actualDataShare) {
        public BigDecimal embeddedKg() {
            return directKg.add(indirectKg).add(precursorKg);
        }
    }

    private final OrganizationService organizationService;
    private final ProductFootprintRepository footprints;
    private final ProductionOutputRepository outputs;
    private final ActivityRepository activities;
    private final EmissionRecordRepository records;
    private final UnitConverter units;

    /** Chỉ dùng cho test phép chia theo khối lượng. */
    public AllocationService(OrganizationService organizationService, ProductFootprintRepository footprints) {
        this(organizationService, footprints, null, null, null, new UnitConverter());
    }

    @Autowired
    public AllocationService(OrganizationService organizationService, ProductFootprintRepository footprints,
                             ProductionOutputRepository outputs, ActivityRepository activities,
                             EmissionRecordRepository records, UnitConverter units) {
        this.organizationService = organizationService;
        this.footprints = footprints;
        this.outputs = outputs;
        this.activities = activities;
        this.records = records;
        this.units = units;
    }

    /**
     * Tính phát thải trên mỗi tấn sản phẩm khi phân bổ theo khối lượng.
     *
     * @param totalScopeKg tổng phát thải của một phần (trực tiếp / gián tiếp / tiền chất), đơn vị kg CO2e
     * @param totalOutputTonnes tổng sản lượng toàn nhà máy trong kỳ (tấn)
     * @return tCO2e / tấn sản phẩm
     */
    public BigDecimal allocateByMassPerTonne(BigDecimal totalScopeKg, BigDecimal totalOutputTonnes) {
        if (totalOutputTonnes == null || totalOutputTonnes.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("totalOutputTonnes must be > 0");
        }
        return totalScopeKg
                .divide(new BigDecimal("1000"), 12, RoundingMode.HALF_UP)
                .divide(totalOutputTonnes, 6, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public List<ProductFootprint> getFootprints(UUID periodId) {
        organizationService.requirePeriod(periodId);
        return footprints.findAllByPeriodId(periodId);
    }

    /**
     * Tổng phát thải nhúng của kỳ. Tỷ lệ dữ liệu thực tế = phần phát thải tính từ hoạt động có chứng từ gốc
     * và hệ số cụ thể (không phải hệ số mặc định GENERIC), chia cho tổng phát thải nhúng.
     */
    @Transactional(readOnly = true)
    public PeriodTotals totals(UUID organizationId, UUID periodId) {
        Map<UUID, ActivityData> acts = activities
                .findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(organizationId, periodId).stream()
                .collect(Collectors.toMap(ActivityData::getId, Function.identity()));
        List<EmissionRecord> recs = acts.isEmpty() ? List.of() : records.findAllByActivityDataIdIn(acts.keySet());
        BigDecimal direct = BigDecimal.ZERO, indirect = BigDecimal.ZERO, precursor = BigDecimal.ZERO, actual = BigDecimal.ZERO;
        for (EmissionRecord r : recs) {
            ActivityData a = acts.get(r.getActivityDataId());
            boolean embedded = r.getScope() != 3 || a.getCategory() == ActivityCategory.PURCHASED_MATERIAL;
            if (!embedded) continue;
            if (r.getScope() == 1) direct = direct.add(r.getCo2eKg());
            else if (r.getScope() == 2) indirect = indirect.add(r.getCo2eKg());
            else precursor = precursor.add(r.getCo2eKg());
            if (a.getSourceDocumentId() != null && !"GENERIC".equals(a.getSubCategory())) {
                actual = actual.add(r.getCo2eKg());
            }
        }
        BigDecimal total = direct.add(indirect).add(precursor);
        BigDecimal share = total.signum() > 0 ? actual.divide(total, 4, RoundingMode.HALF_UP) : null;
        return new PeriodTotals(direct, indirect, precursor, share);
    }

    /** Khối lượng một đơn vị sản phẩm tính bằng tấn; null nếu đơn vị không phải khối lượng (không phân bổ theo MASS được). */
    public BigDecimal tonnesPerUnit(String unit) {
        if (unit == null || !units.isSupported(unit) || units.dimensionOf(unit) != UnitConverter.Dimension.MASS) {
            return null;
        }
        return units.convert(BigDecimal.ONE, unit, "kg").divide(THOUSAND, MathContext.DECIMAL64);
    }

    /**
     * Phân bổ lại theo khối lượng cho mọi sản phẩm có sản lượng trong kỳ. Sản phẩm có đơn vị không phải khối lượng
     * không được phân bổ (không có dấu chân), nên sẽ không đạt điều kiện cấp hộ chiếu.
     */
    @Transactional
    public List<ProductFootprint> recompute(ReportingPeriod period) {
        List<ProductionOutput> outs = outputs.findAllByPeriodId(period.getId());
        BigDecimal totalTonnes = BigDecimal.ZERO;
        for (ProductionOutput o : outs) {
            BigDecimal t = tonnesPerUnit(o.getUnit());
            if (t != null) totalTonnes = totalTonnes.add(o.getQuantity().multiply(t));
        }
        if (totalTonnes.signum() <= 0) {
            return List.of();
        }
        PeriodTotals totals = totals(period.getOrganizationId(), period.getId());
        for (ProductionOutput o : outs) {
            BigDecimal t = tonnesPerUnit(o.getUnit());
            if (t == null) continue;
            ProductFootprint fp = footprints.findByPeriodIdAndProductId(period.getId(), o.getProductId())
                    .orElseGet(() -> new ProductFootprint(period.getId(), o.getProductId()));
            fp.update(perUnit(totals.directKg(), totalTonnes, t), perUnit(totals.indirectKg(), totalTonnes, t),
                    perUnit(totals.precursorKg(), totalTonnes, t), totals.actualDataShare(), "MASS");
            footprints.save(fp);
        }
        return footprints.findAllByPeriodId(period.getId());
    }

    /** kgCO2e trên một đơn vị sản phẩm = (phát thải / tổng tấn) × số tấn của một đơn vị. */
    private static BigDecimal perUnit(BigDecimal kg, BigDecimal totalTonnes, BigDecimal tonnesPerUnit) {
        return kg.divide(totalTonnes, MathContext.DECIMAL64).multiply(tonnesPerUnit).setScale(6, RoundingMode.HALF_UP);
    }
}
