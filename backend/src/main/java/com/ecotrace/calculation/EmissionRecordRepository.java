package com.ecotrace.calculation;

import com.ecotrace.calculation.domain.EmissionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface EmissionRecordRepository extends JpaRepository<EmissionRecord, UUID> {

    List<EmissionRecord> findAllByActivityDataIdIn(Collection<UUID> activityDataIds);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from EmissionRecord r where r.activityDataId in :ids")
    void deleteAllByActivityDataIdIn(Collection<UUID> ids);

    @Query("""
            select new com.ecotrace.calculation.PeriodEmissionRow(
                   a.category, a.subCategory, a.activityDate, r.scope, r.co2eKg, r.calculatedAt)
            from EmissionRecord r, ActivityData a
            where r.activityDataId = a.id and a.periodId = :periodId and a.organizationId = :organizationId
            """)
    List<PeriodEmissionRow> findPeriodRows(UUID organizationId, UUID periodId);
}
