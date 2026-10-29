package com.ecotrace.organization.repository;

import com.ecotrace.organization.domain.Facility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FacilityRepository extends JpaRepository<Facility, UUID> {

    List<Facility> findAllByOrganizationIdOrderByCreatedAtAsc(UUID organizationId);

    Optional<Facility> findByIdAndOrganizationId(UUID id, UUID organizationId);
}

