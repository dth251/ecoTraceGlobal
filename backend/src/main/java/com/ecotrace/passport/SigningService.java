package com.ecotrace.passport;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.List;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Ký số ECDSA P-256 và băm SHA-256 cho hộ chiếu xanh (mục 3.2, 10.2).
 * Nếu chưa cấu hình file khóa riêng, sinh cặp khóa tạm trong bộ nhớ cho môi trường dev/test.
 */
@Service
public class SigningService {

    private final KeyPair keyPair;

    /** Khóa tạm trong bộ nhớ (test). */
    public SigningService() {
        this.keyPair = generateEphemeralP256();
    }

    /**
     * Có đường dẫn khóa thì dùng khóa trong file (chưa có thì sinh và lưu lại), để hộ chiếu đã ký vẫn xác minh được
     * sau khi khởi động lại. Không cấu hình đường dẫn thì dùng khóa tạm trong bộ nhớ.
     */
    @Autowired
    public SigningService(@Value("${app.passport.signing-key-path:}") String keyPath) {
        this.keyPair = keyPath == null || keyPath.isBlank() ? generateEphemeralP256() : loadOrCreate(Path.of(keyPath));
    }

    private static KeyPair loadOrCreate(Path path) {
        try {
            KeyFactory kf = KeyFactory.getInstance("EC");
            if (Files.exists(path)) {
                List<String> lines = Files.readAllLines(path);
                PrivateKey priv = kf.generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(lines.get(0).trim())));
                PublicKey pub = kf.generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(lines.get(1).trim())));
                return new KeyPair(pub, priv);
            }
            KeyPair kp = generateEphemeralP256();
            if (path.getParent() != null) Files.createDirectories(path.getParent());
            Files.write(path, List.of(Base64.getEncoder().encodeToString(kp.getPrivate().getEncoded()),
                    Base64.getEncoder().encodeToString(kp.getPublic().getEncoded())));
            return kp;
        } catch (IOException | GeneralSecurityException | RuntimeException e) {
            throw new IllegalStateException("Cannot load or create passport signing key at " + path, e);
        }
    }

    private static final com.fasterxml.jackson.databind.ObjectMapper CANONICAL = new com.fasterxml.jackson.databind.ObjectMapper()
            .configure(com.fasterxml.jackson.databind.SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true)
            .findAndRegisterModules();

    /** Dạng JSON chuẩn hóa (khóa sắp xếp) dùng để băm và ký payload; khi cấp hộ chiếu phải ký đúng dạng này để kiểm tra lại được. */
    public static String canonicalJson(java.util.Map<String, Object> payload) {
        try {
            return CANONICAL.writeValueAsString(payload);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("Cannot canonicalize payload", e);
        }
    }

    /**
     * Chuẩn hóa payload qua một vòng JSON (số thập phân thành dạng sẽ đọc lại từ cột JSONB) trước khi ký,
     * để payload đọc lại từ database cho ra đúng chuỗi đã ký.
     */
    @SuppressWarnings("unchecked")
    public static java.util.Map<String, Object> normalize(java.util.Map<String, Object> payload) {
        try {
            return CANONICAL.readValue(CANONICAL.writeValueAsString(payload), java.util.LinkedHashMap.class);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("Cannot normalize payload", e);
        }
    }

    public String sha256Hex(String canonicalJson) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonicalJson.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    public String sign(String canonicalJson) {
        try {
            Signature sig = Signature.getInstance("SHA256withECDSA");
            sig.initSign(privateKey());
            sig.update(canonicalJson.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(sig.sign());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Signing failed", e);
        }
    }

    public boolean verify(String canonicalJson, String signatureBase64) {
        try {
            Signature sig = Signature.getInstance("SHA256withECDSA");
            sig.initVerify(publicKey());
            sig.update(canonicalJson.getBytes(StandardCharsets.UTF_8));
            return sig.verify(Base64.getDecoder().decode(signatureBase64));
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            return false;
        }
    }

    PrivateKey privateKey() {
        return keyPair.getPrivate();
    }

    PublicKey publicKey() {
        return keyPair.getPublic();
    }

    private static KeyPair generateEphemeralP256() {
        try {
            KeyPairGenerator gen = KeyPairGenerator.getInstance("EC");
            gen.initialize(new ECGenParameterSpec("secp256r1"));
            return gen.generateKeyPair();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Cannot generate ECDSA P-256 key pair", e);
        }
    }
}

