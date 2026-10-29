package com.ecotrace.document.storage;

import com.ecotrace.config.StorageConfig.StorageProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

/**
 * Lưu chứng từ trên ổ đĩa cho môi trường chạy local không Docker/MinIO.
 * URL xem file là URL ký HMAC có hạn (tương tự presigned URL của S3), phục vụ bởi {@link FileController}.
 */
@Component
@ConditionalOnProperty(prefix = "app.storage", name = "type", havingValue = "local", matchIfMissing = true)
public class LocalFileStorage implements FileStorage {

    private final Path root;
    private final String publicBaseUrl;
    private final Duration ttl;
    private final byte[] secret;

    public LocalFileStorage(StorageProperties props, @Value("${app.jwt.secret}") String secret) {
        this.root = Path.of(props.localDir() != null ? props.localDir() : "./data/uploads").toAbsolutePath().normalize();
        this.publicBaseUrl = props.localPublicBaseUrl() != null ? props.localPublicBaseUrl() : "http://localhost:8080/api/v1";
        this.ttl = props.presignedUrlTtl() != null ? props.presignedUrlTtl() : Duration.ofMinutes(5);
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public void putObject(String key, String contentType, byte[] bytes) {
        try {
            Path target = resolve(key);
            Files.createDirectories(target.getParent());
            Files.write(target, bytes);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot store file " + key, e);
        }
    }

    @Override
    public URL presignGetUrl(String key) {
        long exp = Instant.now().plus(ttl).getEpochSecond();
        try {
            return URI.create(publicBaseUrl + "/files/" + key + "?exp=" + exp + "&sig=" + sign(key, exp)).toURL();
        } catch (MalformedURLException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Đọc file nếu chữ ký hợp lệ và chưa hết hạn; trả null nếu không hợp lệ. */
    public byte[] readSigned(String key, long exp, String sig) {
        if (Instant.now().getEpochSecond() > exp
                || !MessageDigest.isEqual(sign(key, exp).getBytes(StandardCharsets.UTF_8), sig.getBytes(StandardCharsets.UTF_8))) {
            return null;
        }
        try {
            Path file = resolve(key);
            return Files.exists(file) ? Files.readAllBytes(file) : null;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private Path resolve(String key) {
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return p;
    }

    private String sign(String key, long exp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((key + "|" + exp).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
