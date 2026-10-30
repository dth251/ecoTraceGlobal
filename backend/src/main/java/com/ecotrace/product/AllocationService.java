package com.ecotrace.product;

import com.ecotrace.activity.ActivityRepository;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.EmissionRecordRepository;
import com.ecotrace.calculation.PeriodEmissionRow;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.common.util.UnitConverter;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.product.domain.Product;
import com.ecotrace.product.domain.ProductFootprint;
import com.ecotrace.product.domain.ProductionOutput;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Phân bổ phát thải của kỳ cho từng sản phẩm theo khối lượng (MASS, mục 8.4).
 * Scope 1 → trực tiếp, Scope 2 → gián tiếp, Scope 3 → tiền chất/chuỗi cung ứng.
 */
@Service
public class AllocationService {

    private static final BigDecimal THOUSAND = new BigDecimal("1000");

    private final OrganizationService organizationService;
    private final ProductFootprintRepository footprints;
    private final ProductionOutputRepository outputs;
    private final ProductRepository products;
    private final EmissionRecordRepository records;
    private final ActivityRepository activities;
    private final UnitConverter unitConverter;

    public AllocationService(OrganizationService organizationService, ProductFootprintRepository footprints,
                             ProductionOutputRepository outputs, ProductRepository products,
                             EmissionRecordRepository records, ActivityRepository activities,
                             UnitConverter unitConverter) {
        this.organizationService = organizationService;
        this.footprints = footprints;
        this.outputs = outputs;
        this.products = products;
        this.records = records;
        this.activities = activities;
        this.unitConverter = unitConverter;
    }

    /** Dòng phát thải sản phẩm trả cho frontend (kgCO₂e trên mỗi đơn vị sản phẩm). */
    public record FootprintView(UUID productId, String productName, BigDecimal directPerUnit,
                                BigDecimal indirectPerUnit, BigDecimal precursorPerUnit, BigDecimal totalPerUnit,
                                BigDecimal actualDataShare, String allocationMethod) {
    }

    public record ProductionItem(UUID productId, BigDecimal quantity, String unit) {
    }

    public BigDecimal allocateByMassPerTonne(BigDecimal totalScopeKg, BigDecimal totalOutputTonnes) {
        if (totalOutputTonnes == null || totalOutputTonnes.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("totalOutputTonnes must be > 0");
        }
        return totalScopeKg
                .divide(new BigDecimal("1000"), 12, RoundingMode.HALF_UP)
                .divide(totalOutputTonnes, 6, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public List<FootprintView> getFootprints(UUID periodId) {
        organizationService.requirePeriod(periodId);
        Map<UUID, Product> byId = productsOfTenant();
        return footprints.findAllByPeriodId(periodId).stream()
                .filter(f -> byId.containsKey(f.getProductId()))
                .map(f -> new FootprintView(f.getProductId(), byId.get(f.getProductId()).getName(),
                        f.getDirectCo2ePerUnit(), f.getIndirectCo2ePerUnit(), f.getPrecursorCo2ePerUnit(),
                        f.getTotalCo2ePerUnit(), f.getActualDataShare(), f.getAllocationMethod()))
                .toList();
    }

    /** Ghi đè sản lượng của kỳ rồi phân bổ lại phát thải. */
    @Transactional
    public List<FootprintView> saveProduction(UUID periodId, List<ProductionItem> items) {
        organizationService.requireOpenPeriod(periodId);
        Map<UUID, Product> byId = productsOfTenant();
        for (ProductionItem item : items) {
            if (!byId.containsKey(item.productId())) {
                throw ApiException.notFound("product", item.productId());
            }
            if (item.quantity() == null || item.quantity().signum() <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "quantity must be > 0");
            }
        }
        outputs.deleteAllByPeriodId(periodId);
        for (ProductionItem item : items) {
            String unit = item.unit() != null ? item.unit() : byId.get(item.productId()).getUnit();
            outputs.save(new ProductionOutput(periodId, item.productId(), item.quantity(), unit));
        }
        recalculate(periodId);
        return getFootprints(periodId);
    }

    /**
     * Tính lại product_footprint của kỳ từ emission_record hiện có.
     * Chỉ sản phẩm có đơn vị khối lượng mới phân bổ được theo MASS; sản phẩm khác bị bỏ qua.
     */
    @Transactional
    public void recalculate(UUID periodId) {
        UUID orgId = TenantContext.organizationId();
        footprints.deleteAllByPeriodId(periodId);

        List<ProductionOutput> massOutputs = outputs.findAllByPeriodId(periodId).stream()
                .filter(o -> isMass(o.getUnit()))
                .toList();
        Map<UUID, BigDecimal> tonnesByProduct = new HashMap<>();
        for (ProductionOutput o : massOutputs) {
            tonnesByProduct.merge(o.getProductId(), unitConverter.convert(o.getQuantity(), o.getUnit(), "t"),
                    BigDecimal::add);
        }
        BigDecimal totalTonnes = tonnesByProduct.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalTonnes.signum() <= 0) return;

        BigDecimal[] scopeKg = {BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO};
        for (PeriodEmissionRow r : records.findPeriodRows(orgId, periodId)) {
            scopeKg[r.scope() - 1] = scopeKg[r.scope() - 1].add(r.co2eKg());
        }
        BigDecimal actualShare = actualDataShare(orgId, periodId);
        Map<UUID, Product> byId = productsOfTenant();

        for (UUID productId : tonnesByProduct.keySet()) {
            // kgCO₂e trên mỗi tấn → quy về đơn vị khai báo của sản phẩm
            BigDecimal unitInTonnes = unitConverter.convert(BigDecimal.ONE, byId.get(productId).getUnit(), "t");
            footprints.save(new ProductFootprint(periodId, productId,
                    perUnit(scopeKg[0], totalTonnes, unitInTonnes),
                    perUnit(scopeKg[1], totalTonnes, unitInTonnes),
                    perUnit(scopeKg[2], totalTonnes, unitInTonnes),
                    actualShare));
        }
    }

    private BigDecimal perUnit(BigDecimal scopeKg, BigDecimal totalTonnes, BigDecimal unitInTonnes) {
        return allocateByMassPerTonne(scopeKg.multiply(THOUSAND), totalTonnes)
                .multiply(unitInTonnes)
                .setScale(6, RoundingMode.HALF_UP);
    }

    /** Tỷ lệ hoạt động có chứng từ hoặc file nhập làm bằng chứng (không phải nhập tay). */
    private BigDecimal actualDataShare(UUID orgId, UUID periodId) {
        List<ActivityData> list = activities.findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(orgId, periodId);
        if (list.isEmpty()) return BigDecimal.ZERO;
        long evidenced = list.stream().filter(a -> a.getEntryMethod() != ActivityData.EntryMethod.MANUAL).count();
        return BigDecimal.valueOf(evidenced).divide(BigDecimal.valueOf(list.size()), 4, RoundingMode.HALF_UP);
    }

    private boolean isMass(String unit) {
        return unitConverter.isSupported(unit) && unitConverter.dimensionOf(unit) == UnitConverter.Dimension.MASS;
    }

    private Map<UUID, Product> productsOfTenant() {
        return products.findAllByOrganizationIdOrderByCreatedAtAsc(TenantContext.organizationId()).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
    }
}
