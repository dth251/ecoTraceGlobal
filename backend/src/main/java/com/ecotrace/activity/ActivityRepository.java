package com.ecotrace.activity;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.activity.domain.ActivityData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<ActivityData, UUID> {

    List<ActivityData> findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(UUID organizationId, UUID periodId);

    List<ActivityData> findAllByOrganizationIdAndPeriodIdAndCategoryOrderByActivityDateDesc(
            UUID organizationId, UUID periodId, ActivityCategory category);

    List<ActivityData> findAllByOrganizationIdAndSourceDocumentId(UUID organizationId, UUID sourceDocumentId);

    Optional<ActivityData> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
