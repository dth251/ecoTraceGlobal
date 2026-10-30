package com.ecotrace.product;

import com.ecotrace.product.domain.ProductionOutput;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ProductionOutputRepository extends JpaRepository<ProductionOutput, UUID> {

    List<ProductionOutput> findAllByPeriodId(UUID periodId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from ProductionOutput p where p.periodId = :periodId")
    void deleteAllByPeriodId(UUID periodId);
}
