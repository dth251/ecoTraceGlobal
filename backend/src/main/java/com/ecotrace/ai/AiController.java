package com.ecotrace.ai;

import com.ecotrace.ai.dto.AiDtos.*;
import com.ecotrace.passport.PassportReadinessService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@Tag(name = "AI Service Integration")
@RestController
@RequestMapping("/ai")
public class AiController {

    private final AiServiceClient client;
    private final PassportReadinessService passportReadiness;

    public AiController(AiServiceClient client, PassportReadinessService passportReadiness) {
        this.client = client;
        this.passportReadiness = passportReadiness;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return client.checkHealth();
    }

    @PostMapping(path = "/extract-invoice", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public ExtractionResponse extractInvoice(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String docType) {
        return client.extractInvoice(file, docType);
    }

    @PostMapping("/classify-activity")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public ClassifyResponse classifyActivity(@RequestBody ClassifyRequest request) {
        return client.classifyActivity(request);
    }

    @PostMapping("/optimize/{periodId}")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public OptimizeResponse optimize(
            @PathVariable UUID periodId,
            @RequestParam(defaultValue = "vi") String language,
            @RequestParam(defaultValue = "5") Integer maxSuggestions) {
        return client.optimizePeriod(periodId, language, maxSuggestions);
    }

    @GetMapping("/passports/{code}/audit")
    public PassportReadinessResponse auditPassport(@PathVariable String code,
                                                   @RequestParam(defaultValue = "vi") String language) {
        return passportReadiness.audit(code, language);
    }
}

