package com.ecotrace.auth;

import com.ecotrace.common.exception.ApiException;
import com.ecotrace.organization.domain.AppUser;
import com.ecotrace.organization.domain.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/** Tạo và kiểm tra JWT (access + refresh). */
@Service
public class JwtService {

    static final String CLAIM_ORG = "org";
    static final String CLAIM_ROLE = "role";
    static final String CLAIM_EMAIL = "email";
    static final String CLAIM_TYPE = "typ";
    static final String TYPE_ACCESS = "access";
    static final String TYPE_REFRESH = "refresh";

    private final JwtProperties props;
    private final SecretKey key;

    public JwtService(JwtProperties props) {
        this.props = props;
        this.key = Keys.hmacShaKeyFor(props.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(AppUser user) {
        return build(user, TYPE_ACCESS, props.accessTokenTtl().toSeconds());
    }

    public String createRefreshToken(AppUser user) {
        return build(user, TYPE_REFRESH, props.refreshTokenTtl().toSeconds());
    }

    public long accessTokenTtlSeconds() {
        return props.accessTokenTtl().toSeconds();
    }

    /** Kiểm tra access token và trả về principal. */
    public AuthPrincipal parseAccessToken(String token) {
        Claims c = parse(token, TYPE_ACCESS);
        return new AuthPrincipal(
                UUID.fromString(c.getSubject()),
                UUID.fromString(c.get(CLAIM_ORG, String.class)),
                c.get(CLAIM_EMAIL, String.class),
                Role.valueOf(c.get(CLAIM_ROLE, String.class)));
    }

    /** Kiểm tra refresh token và trả về userId. */
    public UUID parseRefreshToken(String token) {
        return UUID.fromString(parse(token, TYPE_REFRESH).getSubject());
    }

    private String build(AppUser user, String type, long ttlSeconds) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim(CLAIM_ORG, user.getOrganization().getId().toString())
                .claim(CLAIM_ROLE, user.getRole().name())
                .claim(CLAIM_EMAIL, user.getEmail())
                .claim(CLAIM_TYPE, type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds)))
                .signWith(key)
                .compact();
    }

    private Claims parse(String token, String expectedType) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            if (!expectedType.equals(claims.get(CLAIM_TYPE, String.class))) {
                throw invalid();
            }
            return claims;
        } catch (JwtException | IllegalArgumentException e) {
            throw invalid();
        }
    }

    private static ApiException invalid() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Invalid or expired token");
    }
}

