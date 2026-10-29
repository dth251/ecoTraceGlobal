package com.ecotrace.activity;

import com.ecotrace.activity.domain.ActivityCategory;
import com.ecotrace.activity.domain.ActivityData;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ActivityService {

    private final ActivityRepository repository;

    public ActivityService(ActivityRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ActivityData> list(UUID periodId, ActivityCategory category) {
        UUID orgId = TenantContext.organizationId();
        return category == null
                ? repository.findAllByOrganizationIdAndPeriodIdOrderByActivityDateDesc(orgId, periodId)
                : repository.findAllByOrganizationIdAndPeriodIdAndCategoryOrderByActivityDateDesc(orgId, periodId, category);
    }

    public ActivityData createManual(Map<String, Object> body) {
        throw ApiException.notImplemented("POST /activities");
    }

    public ActivityData update(UUID id, Map<String, Object> body) {
        throw ApiException.notImplemented("PUT /activities/{id}");
    }
}

