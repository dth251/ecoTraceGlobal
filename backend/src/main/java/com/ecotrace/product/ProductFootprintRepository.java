package com.ecotrace.product;

import com.ecotrace.product.domain.ProductFootprint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductFootprintRepository extends JpaRepository<ProductFootprint, UUID> {

    List<ProductFootprint> findAllByPeriodId(UUID periodId);

    Optional<ProductFootprint> findByPeriodIdAndProductId(UUID periodId, UUID productId);
}

