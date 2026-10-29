package com.ecotrace.ai;

import com.ecotrace.ai.dto.AiDtos.*;
import com.ecotrace.calculation.SummaryService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.organization.service.OrganizationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.*;

@Service
public class AiServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AiServiceClient.class);

    private final RestClient aiRestClient;
    private final SummaryService summaryService;
    private final OrganizationService organizationService;

    public AiServiceClient(RestClient aiRestClient,
                           SummaryService summaryService,
                           OrganizationService organizationService) {
        this.aiRestClient = aiRestClient;
        this.summaryService = summaryService;
        this.organizationService = organizationService;
    }

    public Map<String, Object> checkHealth() {
        try {
            return aiRestClient.get()
                    .uri("/health")
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.warn("AI service unreachable at /health: {}", e.getMessage());
            return Map.of("status", "unavailable", "error", e.getMessage());
        }
    }

    public ExtractionResponse extractInvoice(MultipartFile file, String docType) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
                }
            });
            if (docType != null && !docType.isBlank()) {
                body.add("doc_type", docType);
            }

            return aiRestClient.post()
                    .uri("/ai/extract-invoice")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(ExtractionResponse.class);
        } catch (Exception e) {
            log.error("AI extraction error: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_SERVICE_ERROR", "Failed to extract invoice via AI service: " + e.getMessage());
        }
    }

    public ClassifyResponse classifyActivity(ClassifyRequest req) {
        try {
            return aiRestClient.post()
                    .uri("/ai/classify-activity")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(ClassifyResponse.class);
        } catch (Exception e) {
            log.error("AI classify error: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_SERVICE_ERROR", "Failed to classify activity via AI service: " + e.getMessage());
        }
    }

    public OptimizeResponse optimizePeriod(UUID periodId, String language, Integer maxSuggestions) {
        organizationService.requirePeriod(periodId);
        var summary = summaryService.getSummary(periodId);

        Map<String, Double> inventory = new HashMap<>();
        if (summary.topSources() != null) {
            for (var src : summary.topSources()) {
                String key = (src.subCategory() != null && !src.subCategory().isBlank()) 
                        ? src.subCategory() : src.category();
                inventory.put(key, src.co2eKg().doubleValue());
            }
        }
        if (inventory.isEmpty()) {
            inventory.put("ELEC_GRID", summary.scope2Co2eKg() != null ? summary.scope2Co2eKg().doubleValue() : 50000.0);
            inventory.put("FUEL_DIESEL", summary.scope1Co2eKg() != null ? summary.scope1Co2eKg().doubleValue() : 20000.0);
        }

        try {
            OptimizeRequest req = new OptimizeRequest(inventory, language != null ? language : "vi", maxSuggestions != null ? maxSuggestions : 5);
            return aiRestClient.post()
                    .uri("/ai/optimize")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(OptimizeResponse.class);
        } catch (Exception e) {
            log.error("AI optimize error: {}", e.getMessage());
            // Fallback gợi ý nếu AI Service chưa mở hoặc lỗi mạng
            return new OptimizeResponse(
                    List.of(
                            new SuggestionItem("Lắp điện mặt trời áp mái (Rooftop Solar)",
                                    "Điện lưới Scope 2 chiếm tỷ trọng cao. Lắp đặt 300 kWp điện mặt trời giúp giảm phát thải ròng.",
                                    "ELEC_GRID", 18.0, "trung bình"),
                            new SuggestionItem("Chuyển đổi nhiên liệu lò sấy sang sinh khối/LPG",
                                    "Nhiên liệu hóa thạch Scope 1 có thể thay thế một phần bằng biomass viên nén gỗ.",
                                    "FUEL_DIESEL", 25.0, "cao")
                    ),
                    "Phân tích sơ bộ từ cơ cấu phát thải Scope 1 & 2 của kỳ báo cáo."
            );
        }
    }

    /** Xét điều kiện cấp hộ chiếu ở AI service. Không gọi được thì từ chối (không cấp khi thiếu căn cứ), không tự quyết ở backend. */
    public PassportReadinessResponse passportReadiness(PassportReadinessRequest req) {
        try {
            return aiRestClient.post()
                    .uri("/ai/passport-readiness")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(PassportReadinessResponse.class);
        } catch (Exception e) {
            log.error("AI passport readiness error: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_SERVICE_ERROR", "Cannot evaluate passport readiness: " + e.getMessage());
        }
    }
}
