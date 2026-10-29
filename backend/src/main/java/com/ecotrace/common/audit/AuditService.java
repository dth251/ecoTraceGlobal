package com.ecotrace.common.audit;

import com.ecotrace.common.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Ghi audit log cho thao tác nhập liệu, sửa, nhập Excel, khóa kỳ, cấp hộ chiếu (mục 12).
 * Chạy trong cùng transaction với thao tác nghiệp vụ để hai bên nhất quán.
 */
@Service
public class AuditService {

    public static final String CREATE = "CREATE";
    public static final String UPDATE = "UPDATE";
    public static final String DELETE = "DELETE";
    public static final String LOCK = "LOCK";
    public static final String UNLOCK = "UNLOCK";
    public static final String ISSUE_PASSPORT = "ISSUE_PASSPORT";

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String action, String entity, Object entityId, Object before, Object after) {
        UUID orgId = TenantContext.currentPrincipal().map(p -> p.organizationId()).orElse(null);
        UUID userId = TenantContext.currentPrincipal().map(p -> p.userId()).orElse(null);
        record(orgId, userId, action, entity, entityId, before, after);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID orgId, UUID userId, String action, String entity, Object entityId,
                       Object before, Object after) {
        repository.save(new AuditLog(orgId, userId, action, entity,
                entityId == null ? null : entityId.toString(), before, after));
    }
}

