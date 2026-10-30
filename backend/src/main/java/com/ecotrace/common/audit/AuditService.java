package com.ecotrace.common.audit;

import com.ecotrace.common.tenant.TenantContext;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
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

    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {
    };

    private final AuditLogRepository repository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
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
                entityId == null ? null : entityId.toString(), toMap(before), toMap(after)));
    }

    /** Chuyển DTO/entity thành Map để lưu vào cột JSONB (Hibernate không ánh xạ được kiểu Object) */
    private Map<String, Object> toMap(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.convertValue(value, MAP);
        } catch (IllegalArgumentException e) {
            return Map.of("value", String.valueOf(value));
        }
    }
}

