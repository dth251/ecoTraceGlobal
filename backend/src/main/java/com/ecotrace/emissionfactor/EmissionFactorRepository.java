package com.ecotrace.emissionfactor;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.emissionfactor.domain.EmissionFactor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface EmissionFactorRepository extends JpaRepository<EmissionFactor, UUID> {

    @Query("""
            select ef from EmissionFactor ef
            where ef.category = :category
              and (:subCategory is null or ef.subCategory = :subCategory)
              and ef.region in (:region, 'GLOBAL')
              and ef.validFrom <= :date
              and (ef.validTo is null or ef.validTo >= :date)
            order by case when ef.region = :region then 0 else 1 end,
                     ef.version desc, ef.validFrom desc
            """)
    List<EmissionFactor> findMatching(ActivityCategory category, String subCategory, String region, LocalDate date);
}

