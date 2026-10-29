package com.ecotrace.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    /** Đăng ký doanh nghiệp + tài khoản OWNER (mục 19.1). */
    public record RegisterRequest(
            @NotBlank @Size(max = 255) String organizationName,
            @Size(max = 32) String taxCode,
            @NotBlank @Size(max = 255) String fullName,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 72)
            @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "passwordWeak") String password) {
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record UserDto(String id, String email, String fullName, String role,
                          String organizationId, String organizationName) {
    }

    public record AuthResponse(String accessToken, String refreshToken, long expiresIn, UserDto user) {
    }
}

