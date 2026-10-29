package com.ecotrace.auth;

import com.ecotrace.organization.domain.Role;

import java.util.UUID;

/** Thông tin người dùng đã xác thực, lấy từ access token. */
public record AuthPrincipal(UUID userId, UUID organizationId, String email, Role role) {
}

