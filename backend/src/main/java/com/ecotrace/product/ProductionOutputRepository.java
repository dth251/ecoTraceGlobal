package com.ecotrace.product;

import com.ecotrace.product.domain.ProductionOutput;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductionOutputRepository extends JpaRepository<ProductionOutput, UUID> {

    boolean existsByPeriodIdAndProductId(UUID periodId, UUID productId);

    List<ProductionOutput> findAllByPeriodId(UUID periodId);

    Optional<ProductionOutput> findByPeriodIdAndProductId(UUID periodId, UUID productId);
}
