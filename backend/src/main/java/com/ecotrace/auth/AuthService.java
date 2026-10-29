package com.ecotrace.auth;

import com.ecotrace.auth.dto.AuthDtos.AuthResponse;
import com.ecotrace.auth.dto.AuthDtos.LoginRequest;
import com.ecotrace.auth.dto.AuthDtos.RefreshRequest;
import com.ecotrace.auth.dto.AuthDtos.RegisterRequest;
import com.ecotrace.auth.dto.AuthDtos.UserDto;
import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.organization.domain.AppUser;
import com.ecotrace.organization.domain.Organization;
import com.ecotrace.organization.domain.Role;
import com.ecotrace.organization.repository.AppUserRepository;
import com.ecotrace.organization.repository.OrganizationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final OrganizationRepository organizations;
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService audit;

    public AuthService(OrganizationRepository organizations, AppUserRepository users,
                       PasswordEncoder passwordEncoder, JwtService jwtService, AuditService audit) {
        this.organizations = organizations;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.audit = audit;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = normalizeEmail(req.email());
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Email is already in use");
        }
        Organization org = organizations.save(new Organization(req.organizationName().trim(), blankToNull(req.taxCode())));
        AppUser user = users.save(new AppUser(org, email, passwordEncoder.encode(req.password()),
                req.fullName().trim(), Role.OWNER));
        audit.record(org.getId(), user.getId(), AuditService.CREATE, "organization", org.getId(), null, null);
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        AppUser user = users.findByEmail(normalizeEmail(req.email()))
                .filter(AppUser::isActive)
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                // Không tiết lộ sai email hay sai mật khẩu (mục 19.1)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password"));
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(RefreshRequest req) {
        var userId = jwtService.parseRefreshToken(req.refreshToken());
        AppUser user = users.findById(userId)
                .filter(AppUser::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Invalid or expired token"));
        return issueTokens(user);
    }

    private AuthResponse issueTokens(AppUser user) {
        Organization org = user.getOrganization();
        UserDto dto = new UserDto(user.getId().toString(), user.getEmail(), user.getFullName(), user.getRole().name(),
                org.getId().toString(), org.getName());
        return new AuthResponse(jwtService.createAccessToken(user), jwtService.createRefreshToken(user),
                jwtService.accessTokenTtlSeconds(), dto);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}

