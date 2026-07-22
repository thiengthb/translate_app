package com.example.starter_project_2025.system.auth.token.refresh;

import com.example.starter_project_2025.exception.BadRequestException;
import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.auth.util.TokenUtil;
import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import org.springframework.beans.factory.annotation.Value;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RefreshTokenServiceImpl implements RefreshTokenService {

    JwtEncoder jwtEncoder;
    JwtDecoder jwtDecoder;
    RefreshTokenRepository refreshTokenRepository;

    @NonFinal
    @Value("${jwt.access-token.duration}")
    long accessExpirationSeconds;

    @NonFinal
    @Value("${jwt.refresh-token.duration}")
    long refreshExpirationSeconds;

    @Override
    public Jwt decodeAccessToken(String accessToken) {
        return jwtDecoder.decode(accessToken);
    }

    @Override
    public String generateAccessToken(Authentication authentication) {

        Instant now = Instant.now();

        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
                .issuer("rbac-api")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(accessExpirationSeconds))
                .subject(authentication.getName())
            .claim("type", "AccessToken");

        if (authentication.getPrincipal() instanceof UserPrincipal principal) {
            // Keep the access token SMALL: it carries only the user id (the client reads it via
            // getCurrentUserId). Authorization is resolved server-side from the DB on every request
            // (JwtAuthenticationFilter -> UserDetailsService), and the client fetches its roles and
            // permissions from GET /api/me — so none of that belongs in the token. Fat tokens
            // (admin ~18 KB) overflowed nginx's request AND response header buffers (400 / 502).
            claimsBuilder.claim("userId", principal.getUser().getId());
        }

        JwtClaimsSet claims = claimsBuilder.build();

        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    @Override
    public String createRefreshToken(User user) {
        String rawToken = UUID.randomUUID().toString() + UUID.randomUUID();

        HttpServletRequest req = currentRequest();
        Instant now = Instant.now();

        RefreshToken token = RefreshToken.builder()
                .tokenHash(TokenUtil.hash(rawToken))
                .user(user)
                .expiryDate(now.plusSeconds(refreshExpirationSeconds))
                .revoked(false)
                .userAgent(truncate(req != null ? req.getHeader("User-Agent") : null, 256))
                .ipAddress(req != null ? req.getRemoteAddr() : null)
                .lastUsedAt(now)
                .build();

        refreshTokenRepository.save(token);

        return rawToken;
    }

    @Override
    public RefreshToken verifyRefreshToken(String rawToken) {
        String hash = TokenUtil.hash(rawToken);

        RefreshToken token = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new BadRequestException("error.token.invalidRefresh"));

        if (token.isRevoked()) {
            throw new BadRequestException("error.token.refreshRevoked");
        }

        if (token.getExpiryDate().isBefore(Instant.now())) {
            token.setRevoked(true);
            refreshTokenRepository.save(token);

            throw new BadRequestException("error.token.refreshExpired");
        }

        token.setLastUsedAt(Instant.now());
        refreshTokenRepository.save(token);

        return token;
    }

    private static HttpServletRequest currentRequest() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        return attrs instanceof ServletRequestAttributes s ? s.getRequest() : null;
    }

    private static String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }

    @Override
    @Transactional
    public String rotateRefreshToken(RefreshToken oldToken) {
        oldToken.setRevoked(true);
        refreshTokenRepository.save(oldToken);

        return createRefreshToken(
                oldToken.getUser()
        );
    }

    @Override
    public void revokeRefreshToken(String rawToken) {
        String hash = TokenUtil.hash(rawToken);

        refreshTokenRepository.findByTokenHash(hash)
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
    }

    @Override
    public void revokeAllRefreshTokens(Long userId) {
        List<RefreshToken> tokens = refreshTokenRepository.findAllByUserId(userId);

        tokens.forEach(t -> t.setRevoked(true));

        refreshTokenRepository.saveAll(tokens);
    }

}
