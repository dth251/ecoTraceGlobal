package com.ecotrace.passport;

import org.springframework.stereotype.Service;

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

    public SigningService() {
        this.keyPair = generateEphemeralP256();
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

