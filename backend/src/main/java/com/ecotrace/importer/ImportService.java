package com.ecotrace.importer;

import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.importer.domain.ImportBatch;
import com.ecotrace.importer.template.TemplateGenerator;
import com.ecotrace.importer.template.TemplateType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/** Dịch vụ nhập file Excel mẫu hai bước: kiểm tra xem trước → ghi (mục 7.3 — Sprint 3). */
@Service
public class ImportService {

    private final ImportBatchRepository batches;
    private final TemplateGenerator templateGenerator;

    public ImportService(ImportBatchRepository batches, TemplateGenerator templateGenerator) {
        this.batches = batches;
        this.templateGenerator = templateGenerator;
    }

    public byte[] downloadTemplate(TemplateType type) {
        return templateGenerator.generate(type);
    }

    @Transactional(readOnly = true)
    public List<ImportBatch> list(UUID periodId) {
        return batches.findAllByOrganizationIdAndPeriodIdOrderByCreatedAtDesc(TenantContext.organizationId(), periodId);
    }

    @Transactional(readOnly = true)
    public ImportBatch get(UUID id) {
        return batches.findByIdAndOrganizationId(id, TenantContext.organizationId())
                .orElseThrow(() -> ApiException.notFound("import_batch", id));
    }

    public ImportBatch validateUpload(UUID periodId, TemplateType type, MultipartFile file) {
        throw ApiException.notImplemented("POST /imports");
    }

    public byte[] downloadErrorsFile(UUID id) {
        throw ApiException.notImplemented("GET /imports/{id}/errors.xlsx");
    }

    public ImportBatch commit(UUID id) {
        throw ApiException.notImplemented("POST /imports/{id}/commit");
    }

    public void cancel(UUID id) {
        throw ApiException.notImplemented("DELETE /imports/{id}");
    }
}

