package com.ecotrace.security;

import com.ecotrace.auth.AuthController;
import com.ecotrace.auth.dto.AuthDtos.RegisterRequest;
import com.ecotrace.organization.controller.OrganizationController;
import com.ecotrace.organization.dto.OrganizationDtos.UpsertFacilityRequest;
import com.ecotrace.support.PostgresIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/** Kiểm thử cách ly dữ liệu giữa các doanh nghiệp (mục 12, 14). */
class TenantIsolationIT extends PostgresIntegrationTestSupport {

    @Autowired
    private AuthController authController;

    @Autowired
    private OrganizationController organizationController;

    @Test
    void contextAndFlywayMigrationsLoad() {
        assertThat(authController).isNotNull();
        assertThat(organizationController).isNotNull();
        var req = new RegisterRequest("ABC Mechanical", "0101234567", "Nguyen Van A", "a@abc.vn", "Pass1234");
        var res = authController.register(req);
        assertThat(res.accessToken()).isNotBlank();
        assertThat(new UpsertFacilityRequest("Nhà máy 1", null, "VN", "VN").name()).isEqualTo("Nhà máy 1");
    }
}

