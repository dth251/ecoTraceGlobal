package com.ecotrace.common.tenant;

import com.ecotrace.auth.AuthPrincipal;
import com.ecotrace.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

/**
 * Lấy tenant (organization_id) và người dùng hiện tại từ JWT.
 * Mọi truy vấn nghiệp vụ phải lọc theo {@link #organizationId()} (mục 12).
 */
public final class TenantContext {

    private TenantContext() {
    }

    public static Optional<AuthPrincipal> currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthPrincipal p) {
            return Optional.of(p);
        }
        return Optional.empty();
    }

    public static AuthPrincipal principal() {
        return currentPrincipal()
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Not authenticated"));
    }

    public static UUID organizationId() {
        return principal().organizationId();
    }

    public static UUID userId() {
        return principal().userId();
    }
}

