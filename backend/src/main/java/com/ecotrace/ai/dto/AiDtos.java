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

    public record PassportAuditCheck(
            String code,
            String title,
            String status, // PASSED, WARNING, FAILED
            String message,
            String suggestion
    ) {}

    public record PassportAuditResponse(
            String publicCode,
            int readinessScore,
            String overallAssessment,
            List<PassportAuditCheck> checks
    ) {}
}

