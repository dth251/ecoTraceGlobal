package com.ecotrace.ai;

import com.ecotrace.ai.dto.AiDtos.*;
import com.ecotrace.calculation.SummaryService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.passport.PassportService;
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
    private final PassportService passportService;

    public AiServiceClient(RestClient aiRestClient,
                           SummaryService summaryService,
                           OrganizationService organizationService,
                           PassportService passportService) {
        this.aiRestClient = aiRestClient;
        this.summaryService = summaryService;
        this.organizationService = organizationService;
        this.passportService = passportService;
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
     * Gửi cơ cấu phát thải thật của kỳ sang AI service. Khóa phải theo mã AI service nhận diện
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

    /** Rà soát hồ sơ hộ chiếu bằng quy tắc, dựa trên dữ liệu đã ký (chữ ký được kiểm tra lại thật). */
    public PassportAuditResponse auditPassport(String publicCode) {
        Map<String, Object> v = passportService.verifyPublicCode(publicCode);
        List<PassportAuditCheck> checks = new ArrayList<>();
        int score = 100;

        boolean revoked = "REVOKED".equals(v.get("status"));
        boolean signatureValid = Boolean.TRUE.equals(v.get("signatureValid"));
        if (revoked) {
            checks.add(new PassportAuditCheck("SIGNATURE_STATUS", "Tính pháp lý chữ ký", "FAILED",
                    "Hộ chiếu đã bị thu hồi vào " + v.get("revokedAt"), "Cần phát hành hộ chiếu mới"));
            score -= 40;
        } else if (!signatureValid) {
            checks.add(new PassportAuditCheck("SIGNATURE_STATUS", "Tính pháp lý chữ ký", "FAILED",
                    "Chữ ký ECDSA không khớp với nội dung hoặc khóa ký hiện tại", "Phát hành lại hộ chiếu"));
            score -= 40;
        } else {
            checks.add(new PassportAuditCheck("SIGNATURE_STATUS", "Tính pháp lý chữ ký", "PASSED",
                    "Chữ ký ECDSA P-256 khớp với mã SHA-256 của nội dung", "Đạt chuẩn niêm phong số"));
        }

        double actualShare = decimal(v.get("actualDataShare"));
        if (actualShare >= 0.5) {
            checks.add(new PassportAuditCheck("ACTUAL_DATA_SHARE", "Tỷ lệ dữ liệu có chứng từ", "PASSED",
                    String.format("%.1f%% hoạt động có chứng từ hoặc file nhập làm bằng chứng", actualShare * 100),
                    "Duy trì thu thập số liệu hóa đơn thực tế"));
        } else {
            checks.add(new PassportAuditCheck("ACTUAL_DATA_SHARE", "Tỷ lệ dữ liệu có chứng từ", "WARNING",
                    String.format("Chỉ %.1f%% hoạt động có chứng từ, phần còn lại nhập tay", actualShare * 100),
                    "Bổ sung hóa đơn gốc cho các hoạt động nhập tay"));
            score -= 15;
        }

        if ("VERIFIED".equals(v.get("verificationLevel"))) {
            checks.add(new PassportAuditCheck("VERIFICATION_LEVEL", "Mức độ kiểm định", "PASSED",
                    "Đã được bên thứ ba thẩm định độc lập", "Hồ sơ có độ tin cậy cao"));
        } else {
            checks.add(new PassportAuditCheck("VERIFICATION_LEVEL", "Mức độ kiểm định", "WARNING",
                    "Hồ sơ đang ở mức tự khai báo (Self-declared)",
                    "Liên hệ tổ chức chứng nhận độc lập trước khi gửi thẩm định chính thức"));
            score -= 10;
        }

        if (decimal(v.get("precursorPerUnit")) > 0) {
            checks.add(new PassportAuditCheck("PRECURSOR_EMISSIONS", "Phát thải tiền chất (Scope 3)", "PASSED",
                    "Đã tính phát thải nguyên liệu và vận chuyển vào từng đơn vị sản phẩm",
                    "Yêu cầu nhà cung ứng cung cấp số liệu thực tế để thay hệ số mặc định"));
        } else {
            checks.add(new PassportAuditCheck("PRECURSOR_EMISSIONS", "Phát thải tiền chất (Scope 3)", "WARNING",
                    "Chưa có phát thải nguyên liệu hoặc vận chuyển trong kỳ", "Nhập hóa đơn nguyên liệu và vận đơn"));
            score -= 15;
        }

        String overall = score >= 85
                ? "Hồ sơ đạt các kiểm tra chính, có thể xuất trình cho đối tác."
                : "Hồ sơ cần bổ sung trước khi xuất trình cho đối tác.";
        return new PassportAuditResponse(publicCode, Math.max(score, 0), overall, checks);
    }

    private static double decimal(Object v) {
        if (v == null) return 0;
        try {
            return new BigDecimal(v.toString()).doubleValue();
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
