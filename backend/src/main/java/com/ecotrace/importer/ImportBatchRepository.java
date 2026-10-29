package com.ecotrace.importer;

import com.ecotrace.importer.domain.ImportBatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ImportBatchRepository extends JpaRepository<ImportBatch, UUID> {

    List<ImportBatch> findAllByOrganizationIdAndPeriodIdOrderByCreatedAtDesc(UUID organizationId, UUID periodId);

    Optional<ImportBatch> findByIdAndOrganizationId(UUID id, UUID organizationId);
}

