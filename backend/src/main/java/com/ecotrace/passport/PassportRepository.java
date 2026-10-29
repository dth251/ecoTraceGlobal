package com.ecotrace.passport;

import com.ecotrace.passport.domain.Passport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PassportRepository extends JpaRepository<Passport, UUID> {

    List<Passport> findAllByOrganizationIdAndPeriodIdOrderByIssuedAtDesc(UUID organizationId, UUID periodId);

    Optional<Passport> findByPublicCode(String publicCode);
}

