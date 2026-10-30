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

    /**
     * Gửi cơ cấu phát thải thật của kỳ sang AI service. Khóa theo mã AI service nhận diện
     * (ELEC_GRID, FUEL_*, MAT_*, FREIGHT_*). Không có dữ liệu hoặc AI không phản hồi thì báo lỗi, không trả gợi ý giả.
     */
    public OptimizeResponse optimizePeriod(UUID periodId, String language, Integer maxSuggestions) {
        organizationService.requirePeriod(periodId);
        var summary = summaryService.getSummary(periodId);

        Map<String, Double> inventory = new HashMap<>();
        for (var src : summary.topSources()) {
            inventory.merge(aiCode(src.category(), src.subCategory()), src.co2eKg().doubleValue(), Double::sum);
        }
        if (inventory.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "NO_EMISSION_DATA",
                    "This period has no calculated emissions to optimise yet");
        }

        try {
            OptimizeRequest req = new OptimizeRequest(inventory, language != null ? language : "vi",
                    maxSuggestions != null ? maxSuggestions : 5);
            return aiRestClient.post()
                    .uri("/ai/optimize")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req)
                    .retrieve()
                    .body(OptimizeResponse.class);
        } catch (Exception e) {
            log.error("AI optimize error: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_SERVICE_ERROR",
                    "AI service is unavailable: " + e.getMessage());
        }
    }

    /** Hạng mục backend → mã nguồn phát thải mà bộ quy tắc của AI service dùng */
    static String aiCode(String category, String subCategory) {
        String sub = subCategory != null && !subCategory.isBlank() ? subCategory.toUpperCase(Locale.ROOT) : "OTHER";
        return switch (category) {
            case "ELECTRICITY" -> "ELEC_GRID";
            case "STATIONARY_FUEL", "MOBILE_FUEL" -> "FUEL_" + sub;
            case "PURCHASED_MATERIAL" -> "MAT_" + sub;
            case "UPSTREAM_TRANSPORT", "DOWNSTREAM_TRANSPORT" -> "FREIGHT_" + sub;
            default -> category + "_" + sub;
        };
    }

    /**
     * Ước tính CO2e cho cả lô chứng từ AI vừa đọc (trang Trợ lý AI), chuyển tiếp nguyên văn sang AI service.
     * Chỉ là ước tính theo hệ số tham khảo; số chính thức do backend tính sau khi người dùng xác nhận chứng từ.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> estimate(Map<String, Object> body) {
        try {
            return aiRestClient.post()
                    .uri("/ai/estimate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.error("AI estimate error: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_SERVICE_ERROR", "AI service is unavailable: " + e.getMessage());
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
