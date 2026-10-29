package com.ecotrace.optimizer.simulation;

import com.ecotrace.optimizer.domain.Scenario;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/** Bộ mô phỏng kịch bản bằng code xác định (mục 9.3 — Sprint 6). */
@Component
public class ScenarioSimulator {

    public Scenario simulate(UUID periodId, Scenario.Type type, Map<String, Object> parameters,
                             BigDecimal baselineCo2eKg, Scenario.CreatedBy createdBy) {
        // TODO Sprint 6: chuyển sang từng *Scenario theo type
        return new Scenario(periodId, type, parameters, baselineCo2eKg, baselineCo2eKg,
                BigDecimal.ZERO, null, createdBy);
    }
}

