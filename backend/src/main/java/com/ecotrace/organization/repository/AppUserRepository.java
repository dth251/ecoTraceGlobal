package com.ecotrace.organization.repository;

import com.ecotrace.organization.domain.AppUser;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = "organization")
    Optional<AppUser> findByEmail(String email);

    @Override
    @EntityGraph(attributePaths = "organization")
    Optional<AppUser> findById(UUID id);

    List<AppUser> findAllByOrganizationIdOrderByCreatedAtAsc(UUID organizationId);
}

