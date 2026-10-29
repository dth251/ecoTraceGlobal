package com.ecotrace.calculation;

import com.ecotrace.calculation.domain.EmissionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface EmissionRecordRepository extends JpaRepository<EmissionRecord, UUID> {

    List<EmissionRecord> findAllByActivityDataIdIn(Collection<UUID> activityIds);

    @Modifying
    @Query("delete from EmissionRecord r where r.activityDataId in :activityIds")
    void deleteAllForActivities(Collection<UUID> activityIds);
}
