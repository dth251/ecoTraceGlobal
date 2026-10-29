package com.ecotrace.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public final class AiDtos {
    private AiDtos() {}

    public record ClassifyRequest(
            String description,
            String unit,
            @JsonProperty("activity_type") String activityType
    ) {}

    public record ClassifyResponse(
            Short scope,
            @JsonProperty("factor_code") String factorCode,
            Double confidence,
            String reasoning
    ) {}

    public record OptimizeRequest(
            @JsonProperty("inventory_summary") Map<String, Double> inventorySummary,
            String language,
            @JsonProperty("max_suggestions") Integer maxSuggestions
    ) {}

    public record SuggestionItem(
            String title,
            String description,
            @JsonProperty("target_factor_code") String targetFactorCode,
            @JsonProperty("reduction_potential_pct") Double reductionPotentialPct,
            @JsonProperty("difficulty") String difficulty
    ) {}

    public record OptimizeResponse(
            List<SuggestionItem> suggestions,
            String summary
    ) {}

    public record LineItem(
            String description,
            Double quantity,
            String unit,
            @JsonProperty("factor_code") String factorCode,
            Double confidence
    ) {}

    public record ExtractionResponse(
            @JsonProperty("doc_type") String docType,
            @JsonProperty("supplier_name") String supplierName,
            @JsonProperty("invoice_no") String invoiceNo,
            @JsonProperty("invoice_date") String invoiceDate,
            @JsonProperty("total_amount") Double totalAmount,
            String currency,
            List<LineItem> lines,
            @JsonProperty("overall_confidence") Double overallConfidence
    ) {}

    /** Ảnh chụp dữ liệu của kỳ và sản phẩm gửi sang AI service để xét điều kiện cấp hộ chiếu. Trường null nghĩa là chưa có dữ liệu. */
    public record PassportReadinessRequest(
            @JsonProperty("period_locked") Boolean periodLocked,
            @JsonProperty("documents_pending") Integer documentsPending,
            @JsonProperty("documents_rejected") Integer documentsRejected,
            @JsonProperty("activities_total") Integer activitiesTotal,
            @JsonProperty("activities_without_factor") Integer activitiesWithoutFactor,
            @JsonProperty("months_expected") Integer monthsExpected,
            @JsonProperty("months_covered") Integer monthsCovered,
            @JsonProperty("precursors_required") Boolean precursorsRequired,
            @JsonProperty("precursors_covered") Boolean precursorsCovered,
            @JsonProperty("actual_data_share") Double actualDataShare,
            @JsonProperty("unconfirmed_ai_records") Integer unconfirmedAiRecords,
            @JsonProperty("records_without_source") Integer recordsWithoutSource,
            @JsonProperty("production_output_present") Boolean productionOutputPresent,
            @JsonProperty("allocation_method") String allocationMethod,
            @JsonProperty("allocation_error_pct") Double allocationErrorPct,
            @JsonProperty("unresolved_anomalies") Integer unresolvedAnomalies,
            String stage,
            @JsonProperty("signature_valid") Boolean signatureValid,
            boolean revoked,
            String verification,
            @JsonProperty("verifier_name") String verifierName,
            String language
    ) {}

    public record ReadinessCheck(
            String code,
            String title,
            String status, // PASSED, FAILED
            String message,
            String action,
            int weight,
            double earned
    ) {}

    public record ReadinessReason(String code, String title, String message, String action) {}

    public record PassportReadinessResponse(
            String decision, // ISSUED, PROVISIONAL, NOT_ISSUED
            @JsonProperty("can_issue") boolean canIssue,
            int score,
            @JsonProperty("min_score") int minScore,
            List<ReadinessCheck> checks,
            List<String> blockers,
            List<ReadinessReason> reasons,
            @JsonProperty("overall_assessment") String overallAssessment,
            String source, // AI, RULES
            boolean mock
    ) {}
}
