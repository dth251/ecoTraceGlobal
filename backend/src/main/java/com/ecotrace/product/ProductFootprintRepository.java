package com.ecotrace.product;

import com.ecotrace.product.domain.ProductFootprint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductFootprintRepository extends JpaRepository<ProductFootprint, UUID> {

    List<ProductFootprint> findAllByPeriodId(UUID periodId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("delete from ProductFootprint f where f.periodId = :periodId")
    void deleteAllByPeriodId(UUID periodId);
}

