package com.ecotrace.passport;

import com.ecotrace.ai.dto.AiDtos.PassportReadinessResponse;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.product.ProductFootprintRepository;
import com.ecotrace.product.ProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PassportIssueGateTest {

    private final OrganizationService organizations = mock(OrganizationService.class);
    private final PassportReadinessService readiness = mock(PassportReadinessService.class);
    private final PassportService service = new PassportService(mock(PassportRepository.class), organizations, readiness);
    private final UUID periodId = UUID.randomUUID();
    private final UUID productId = UUID.randomUUID();

    private static PassportReadinessResponse response(String decision, boolean canIssue) {
        return new PassportReadinessResponse(decision, canIssue, 40, 85, List.of(), List.of("ACTUAL_DATA_SHARE"), List.of(), "x", "RULES", false);
    }

    private void lockedPeriod() {
        ReportingPeriod period = mock(ReportingPeriod.class);
        when(period.isLocked()).thenReturn(true);
        when(organizations.requirePeriod(periodId)).thenReturn(period);
    }

    @Test
    void refusesToIssueWithReasonsWhenRequirementsAreNotMet() {
        lockedPeriod();
        when(readiness.check(any(), any(), anyString())).thenReturn(response("NOT_ISSUED", false));

        assertThatThrownBy(() -> service.issue(periodId, productId))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
                    assertThat(e.getCode()).isEqualTo("PASSPORT_NOT_READY");
                    assertThat(e.getDetails()).isInstanceOf(PassportReadinessResponse.class);
                });
    }

    @Test
    void passesTheGateWhenReadyAndContinuesToIssue() {
        lockedPeriod();
        when(readiness.check(any(), any(), anyString())).thenReturn(response("PROVISIONAL", true));
        ProductRepository products = mock(ProductRepository.class);
        PassportService full = new PassportService(mock(PassportRepository.class), organizations, readiness,
                new SigningService(), products, mock(ProductFootprintRepository.class), null, null, null);

        // Qua chốt chặn: bước tiếp theo là tìm sản phẩm (ở đây không có nên báo NOT_FOUND, không còn PASSPORT_NOT_READY)
        try (var ignored = org.mockito.Mockito.mockStatic(com.ecotrace.common.tenant.TenantContext.class)) {
            ignored.when(com.ecotrace.common.tenant.TenantContext::organizationId).thenReturn(UUID.randomUUID());
            assertThatThrownBy(() -> full.issue(periodId, productId))
                    .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo("NOT_FOUND"));
        }
    }

    @Test
    void signatureSurvivesTheJsonbRoundTripOfDecimals() {
        SigningService signing = new SigningService();
        Map<String, Object> payload = SigningService.normalize(Map.of("totalPerUnit", new java.math.BigDecimal("1157.904333"),
                "actualDataShare", new java.math.BigDecimal("1.0000")));
        String sig = signing.sign(SigningService.canonicalJson(payload));
        // Cột JSONB đọc lại 1.0000 thành 1.0: payload đã chuẩn hóa vẫn cho đúng chuỗi đã ký
        Map<String, Object> reread = SigningService.normalize(Map.of("totalPerUnit", 1157.904333, "actualDataShare", 1.0));
        assertThat(signing.verify(SigningService.canonicalJson(reread), sig)).isTrue();
    }

    @Test
    void canonicalJsonIsStableRegardlessOfKeyOrder() {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("total", 2.17);
        a.put("company", "ABC");
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("company", "ABC");
        b.put("total", 2.17);

        assertThat(SigningService.canonicalJson(a)).isEqualTo(SigningService.canonicalJson(b))
                .isEqualTo("{\"company\":\"ABC\",\"total\":2.17}");
    }
}
