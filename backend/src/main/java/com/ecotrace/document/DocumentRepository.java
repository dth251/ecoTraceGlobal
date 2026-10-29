package com.ecotrace.document;

import com.ecotrace.document.domain.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findAllByOrganizationIdAndPeriodIdOrderByCreatedAtDesc(UUID organizationId, UUID periodId);

    List<Document> findAllByOrganizationIdAndPeriodIdAndStatusOrderByCreatedAtDesc(
            UUID organizationId, UUID periodId, Document.Status status);

    Optional<Document> findByIdAndOrganizationId(UUID id, UUID organizationId);

    boolean existsByOrganizationIdAndSha256(UUID organizationId, String sha256);
}

