package com.ecotrace.product;

import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.product.domain.ProductFootprint;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

/**
 * Phân bổ phát thải nhà máy về từng sản phẩm theo khối lượng (MASS) hoặc giờ máy (mục 8.2 — Sprint 4).
 */
@Service
public class AllocationService {

    private final OrganizationService organizationService;
    private final ProductFootprintRepository footprints;

    public AllocationService(OrganizationService organizationService, ProductFootprintRepository footprints) {
        this.organizationService = organizationService;
        this.footprints = footprints;
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
}

