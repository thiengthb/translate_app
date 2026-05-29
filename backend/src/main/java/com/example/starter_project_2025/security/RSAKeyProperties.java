package com.example.starter_project_2025.security;

import jakarta.annotation.PostConstruct;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Loads the RSA keypair used to sign/verify JWTs.
 *
 * Order of precedence:
 *  1. Both {@code jwt.rsa-public-key-base64} and {@code jwt.rsa-private-key-base64}
 *     env-vars present → decode the X.509 / PKCS#8 DER from base64.
 *     (Production / multi-instance deployments — JWTs survive restart and are
 *      verifiable across instances.)
 *  2. Otherwise → generate a fresh keypair on boot (dev / single-instance only).
 *
 * Base64 strings should be plain DER (no PEM headers / line breaks).
 * Generate them with:
 *   openssl genrsa -out private.pem 2048
 *   openssl pkcs8 -topk8 -inform PEM -in private.pem -outform DER -nocrypt -out private.der
 *   openssl rsa -in private.pem -pubout -outform DER -out public.der
 *   base64 -w0 private.der  # → JWT_RSA_PRIVATE_KEY_BASE64
 *   base64 -w0 public.der   # → JWT_RSA_PUBLIC_KEY_BASE64
 */
@Slf4j
@Component
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RSAKeyProperties {

    RSAPublicKey publicKey;
    RSAPrivateKey privateKey;

    @Value("${jwt.rsa-public-key-base64:}")
    String publicKeyBase64;

    @Value("${jwt.rsa-private-key-base64:}")
    String privateKeyBase64;

    @PostConstruct
    public void init() {
        if (StringUtils.hasText(publicKeyBase64) && StringUtils.hasText(privateKeyBase64)) {
            try {
                KeyFactory kf = KeyFactory.getInstance("RSA");

                byte[] pub = Base64.getDecoder().decode(publicKeyBase64.trim());
                byte[] priv = Base64.getDecoder().decode(privateKeyBase64.trim());

                this.publicKey = (RSAPublicKey) kf.generatePublic(new X509EncodedKeySpec(pub));
                this.privateKey = (RSAPrivateKey) kf.generatePrivate(new PKCS8EncodedKeySpec(priv));
                log.info("JWT: loaded RSA keypair from configured base64 env vars.");
                return;
            } catch (Exception e) {
                log.error("JWT: failed to parse configured RSA keys, falling back to in-memory generation", e);
            }
        }

        KeyPair pair = KeyGeneratorUtil.generateRsaKey();
        this.publicKey = (RSAPublicKey) pair.getPublic();
        this.privateKey = (RSAPrivateKey) pair.getPrivate();
        log.warn(
                "JWT: generated a fresh in-memory RSA keypair. "
                        + "Restarts will invalidate every existing token and the keypair "
                        + "won't match across instances. Set jwt.rsa-public-key-base64 and "
                        + "jwt.rsa-private-key-base64 for production."
        );
    }
}
