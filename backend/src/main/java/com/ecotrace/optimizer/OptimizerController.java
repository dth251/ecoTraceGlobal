package com.ecotrace.optimizer;

import com.ecotrace.optimizer.domain.Recommendation;
import com.ecotrace.optimizer.domain.Scenario;
import com.ecotrace.optimizer.simulation.ScenarioSimulator;
import com.ecotrace.organization.service.OrganizationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Optimizer & Scenarios")
@RestController
public class OptimizerController {

    private final RecommendationService recommendationService;
    private final ScenarioSimulator simulator;
    private final OrganizationService organizationService;

    public OptimizerController(RecommendationService recommendationService, ScenarioSimulator simulator,
                               OrganizationService organizationService) {
        this.recommendationService = recommendationService;
        this.simulator = simulator;
        this.organizationService = organizationService;
    }

    public record SimulateRequest(@NotNull UUID periodId, @NotNull Scenario.Type type,
                                  @NotNull Map<String, Object> parameters) {
    }

    @PostMapping("/periods/{id}/recommendations/generate")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public List<Recommendation> generate(@PathVariable UUID id) {
        return recommendationService.generate(id);
    }

    @GetMapping("/periods/{id}/recommendations")
    public List<Recommendation> list(@PathVariable UUID id) {
        return recommendationService.list(id);
    }

    @PostMapping("/scenarios/simulate")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public Scenario simulate(@Valid @RequestBody SimulateRequest req) {
        organizationService.requirePeriod(req.periodId());
        return simulator.simulate(req.periodId(), req.type(), req.parameters(),
                BigDecimal.ZERO, Scenario.CreatedBy.USER);
    }
}

