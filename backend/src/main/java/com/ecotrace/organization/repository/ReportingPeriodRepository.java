package com.ecotrace.organization.repository;

import com.ecotrace.organization.domain.ReportingPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReportingPeriodRepository extends JpaRepository<ReportingPeriod, UUID> {

    List<ReportingPeriod> findAllByOrganizationIdOrderByStartDateDesc(UUID organizationId);

    List<ReportingPeriod> findAllByOrganizationIdAndFacilityIdOrderByStartDateDesc(UUID organizationId, UUID facilityId);

    Optional<ReportingPeriod> findByIdAndOrganizationId(UUID id, UUID organizationId);
}

