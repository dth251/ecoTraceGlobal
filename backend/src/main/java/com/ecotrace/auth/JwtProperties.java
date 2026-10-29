package com.ecotrace.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, Duration accessTokenTtl, Duration refreshTokenTtl) {

    public JwtProperties {
        if (secret == null || secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("app.jwt.secret (JWT_SECRET) phải dài ít nhất 32 byte");
        }
        if (accessTokenTtl == null) accessTokenTtl = Duration.ofMinutes(30);
        if (refreshTokenTtl == null) refreshTokenTtl = Duration.ofDays(14);
    }
}

