package com.ecotrace.calculation;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@Tag(name = "Calculations & Summary")
@RestController
@RequestMapping("/periods/{id}")
public class CalculationController {

    private final CalculationService calculationService;
    private final SummaryService summaryService;

    public CalculationController(CalculationService calculationService, SummaryService summaryService) {
        this.calculationService = calculationService;
        this.summaryService = summaryService;
    }

    @PostMapping("/calculate")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public Map<String, Object> calculate(@PathVariable UUID id) {
        return calculationService.calculatePeriod(id);
    }

    @GetMapping("/summary")
    public SummaryService.PeriodSummary summary(@PathVariable UUID id) {
        return summaryService.getSummary(id);
    }
}

