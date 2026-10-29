package com.ecotrace.optimizer.domain;

import com.ecotrace.common.domain.CreatedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.util.UUID;

/** Đề xuất giảm phát thải do bộ quy tắc sinh ra — bảng recommendation (mục 6.3, 9.2). */
@Entity
@Table(name = "recommendation")
public class Recommendation extends CreatedEntity {

    public enum Status {
        NEW,
        ACCEPTED,
        DISMISSED
    }

    @Column(name = "period_id", nullable = false)
    private UUID periodId;

    @Column(name = "scenario_id")
    private UUID scenarioId;

    @Column(name = "rule_code", nullable = false, length = 64)
    private String ruleCode;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false)
    private String explanation;

    @Column(nullable = false)
    private short priority = 2;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.NEW;

    protected Recommendation() {
    }

    public Recommendation(UUID periodId, UUID scenarioId, String ruleCode, String title,
                          String explanation, short priority) {
        this.periodId = periodId;
        this.scenarioId = scenarioId;
        this.ruleCode = ruleCode;
        this.title = title;
        this.explanation = explanation;
        this.priority = priority;
    }

    public UUID getPeriodId() {
        return periodId;
    }

    public UUID getScenarioId() {
        return scenarioId;
    }

    public String getRuleCode() {
        return ruleCode;
    }

    public String getTitle() {
        return title;
    }

    public String getExplanation() {
        return explanation;
    }

    public short getPriority() {
        return priority;
    }

    public Status getStatus() {
        return status;
    }
}

