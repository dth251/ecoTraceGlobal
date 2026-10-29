package com.ecotrace.entry;

import com.ecotrace.common.exception.ApiException;
import com.ecotrace.validation.ValidationIssue;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Dịch vụ nhập liệu từ chứng từ (Sprint 2). */
@Service
public class DocumentEntryService {

    public Map<String, Object> getEntry(UUID documentId) {
        throw ApiException.notImplemented("GET /documents/{id}/entry");
    }

    public Map<String, Object> saveEntry(UUID documentId, Map<String, Object> payload) {
        throw ApiException.notImplemented("PUT /documents/{id}/entry");
    }

    public List<ValidationIssue> validateOnly(UUID documentId, Map<String, Object> payload) {
        return List.of();
    }

    public void reject(UUID documentId, String reason) {
        throw ApiException.notImplemented("POST /documents/{id}/reject");
    }
}

