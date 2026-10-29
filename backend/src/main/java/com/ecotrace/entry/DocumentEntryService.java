package com.ecotrace.entry;

import com.ecotrace.activity.ActivityRepository;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.calculation.EmissionRecordRepository;
import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.document.DocumentService;
import com.ecotrace.document.domain.Document;
import com.ecotrace.document.domain.Document.DocType;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.validation.ValidationIssue;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Nhập liệu từ chứng từ (Sprint 2). Đây là bước người dùng xác nhận: số liệu chỉ vào kiểm kê khi lưu nhập liệu,
 * kể cả khi đã có bản nháp AI. Bản nháp AI được điền sẵn vào form kèm cảnh báo cho các trường AI chưa chắc.
 */
@Service
public class DocumentEntryService {

    private final DocumentService documentService;
    private final ActivityRepository activities;
    private final EmissionRecordRepository emissionRecords;
    private final OrganizationService organizationService;
    private final EntryMapper mapper;
    private final AuditService audit;

    public DocumentEntryService(DocumentService documentService, ActivityRepository activities,
                                EmissionRecordRepository emissionRecords, OrganizationService organizationService,
                                EntryMapper mapper, AuditService audit) {
        this.documentService = documentService;
        this.activities = activities;
        this.emissionRecords = emissionRecords;
        this.organizationService = organizationService;
        this.mapper = mapper;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getEntry(UUID documentId) {
        Document doc = documentService.require(documentId);
        ReportingPeriod period = organizationService.requirePeriod(doc.getPeriodId());
        Map<String, Object> data;
        List<ValidationIssue> issues = new ArrayList<>();
        List<ActivityData> saved = activities.findAllBySourceDocumentId(doc.getId());
        if (!saved.isEmpty() && saved.get(0).getMetadata().get("form") instanceof Map<?, ?> form) {
            data = castMap(form);
        } else if (doc.getAiExtraction() != null && doc.getDocType() != DocType.OTHER) {
            data = mapper.formFromAi(doc.getDocType(), doc.getAiExtraction());
            issues.addAll(aiWarnings(doc));
            issues.addAll(mapper.validate(doc.getDocType(), data, period.getStartDate(), period.getEndDate()));
        } else {
            data = new LinkedHashMap<>();
        }
        return response(doc, data, issues);
    }

    @Transactional
    public Map<String, Object> saveEntry(UUID documentId, Map<String, Object> body) {
        Document doc = documentService.require(documentId);
        ReportingPeriod period = organizationService.requireOpenPeriod(doc.getPeriodId());
        if (body.get("docType") != null) {
            doc.changeDocType(DocType.valueOf(body.get("docType").toString()));
        }
        Map<String, Object> form = body.get("data") instanceof Map<?, ?> m ? castMap(m) : Map.of();
        boolean ack = Boolean.TRUE.equals(body.get("acknowledgeWarnings"));

        List<ValidationIssue> issues = mapper.validate(doc.getDocType(), form, period.getStartDate(), period.getEndDate());
        if (issues.stream().anyMatch(i -> i.level() == ValidationIssue.Level.ERROR)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_FAILED", "Entry has errors", toView(issues));
        }
        if (!ack && issues.stream().anyMatch(i -> i.level() == ValidationIssue.Level.WARNING)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "WARNINGS_NOT_ACKNOWLEDGED",
                    "Confirm the warnings before saving", toView(issues));
        }

        // Thay hoạt động cũ của chứng từ (nếu nhập lại) bằng hoạt động mới; bản ghi phát thải cũ bị xóa, cần tính lại
        List<ActivityData> old = activities.findAllBySourceDocumentId(doc.getId());
        if (!old.isEmpty()) {
            emissionRecords.deleteAllForActivities(old.stream().map(ActivityData::getId).toList());
            activities.deleteAll(old);
        }
        EntryMapper.ActivityDraft draft = mapper.toActivity(doc.getDocType(), form);
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("form", form);
        metadata.put("aiDraft", doc.getAiExtraction() != null);
        metadata.put("warningsAcknowledged", ack && !issues.isEmpty());
        ActivityData activity = activities.save(new ActivityData(doc.getOrganizationId(), doc.getPeriodId(),
                doc.getFacilityId(), ActivityData.EntryMethod.DOCUMENT, draft.category(), draft.subCategory(),
                draft.quantity(), draft.unit(), draft.activityDate())
                .withEvidence(doc.getId(), TenantContext.userId(), metadata));
        doc.markEntered(TenantContext.userId());
        audit.record(AuditService.UPDATE, "document_entry", doc.getId(), null,
                Map.of("activityId", activity.getId().toString(), "category", draft.category().name()));
        return response(doc, form, List.of());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> validateOnly(UUID documentId, Map<String, Object> body) {
        Document doc = documentService.require(documentId);
        ReportingPeriod period = organizationService.requirePeriod(doc.getPeriodId());
        Map<String, Object> form = body.get("data") instanceof Map<?, ?> m ? castMap(m) : body;
        return toView(mapper.validate(doc.getDocType(), form, period.getStartDate(), period.getEndDate()));
    }

    @Transactional
    public void reject(UUID documentId, String reason) {
        Document doc = documentService.require(documentId);
        organizationService.requireOpenPeriod(doc.getPeriodId());
        if (reason == null || reason.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REASON_REQUIRED", "A reason is required to reject a document");
        }
        List<ActivityData> old = activities.findAllBySourceDocumentId(doc.getId());
        if (!old.isEmpty()) {
            emissionRecords.deleteAllForActivities(old.stream().map(ActivityData::getId).toList());
            activities.deleteAll(old);
        }
        doc.reject(reason.trim());
        audit.record(AuditService.UPDATE, "document", doc.getId(), null, Map.of("status", "REJECTED", "reason", reason));
    }

    private List<ValidationIssue> aiWarnings(Document doc) {
        List<ValidationIssue> out = new ArrayList<>();
        for (String field : mapper.aiReviewFields(doc.getAiExtraction())) {
            out.add(ValidationIssue.warning(field, "AI_UNCERTAIN", "AI chưa chắc trường này, hãy đối chiếu với chứng từ gốc"));
        }
        if (doc.getDocType() == DocType.ELECTRICITY_BILL) {
            out.add(ValidationIssue.warning("startDate", "AI_BILLING_PERIOD",
                    "AI lấy kỳ tính tiền theo ngày hóa đơn, hãy kiểm tra ngày đầu và cuối kỳ"));
        }
        return out;
    }

    private Map<String, Object> response(Document doc, Map<String, Object> data, List<ValidationIssue> issues) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("documentId", doc.getId());
        out.put("docType", doc.getDocType());
        out.put("fileName", doc.getFileName());
        out.put("status", doc.getStatus());
        out.put("aiDraft", doc.getAiExtraction() != null);
        out.put("data", data);
        out.put("issues", toView(issues));
        return out;
    }

    /** Dạng lỗi frontend dùng: {field, severity, code, message}. */
    static List<Map<String, Object>> toView(List<ValidationIssue> issues) {
        return issues.stream().map(i -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("field", i.field());
            m.put("severity", i.level().name());
            m.put("code", i.code());
            m.put("message", i.message());
            return m;
        }).toList();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> castMap(Map<?, ?> m) {
        return new LinkedHashMap<>((Map<String, Object>) m);
    }
}
