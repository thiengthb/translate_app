package com.example.starter_project_2025.base.websocket;

import com.example.starter_project_2025.security.UserDetailsServiceImpl;
import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.auth.token.refresh.RefreshTokenService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Authenticates the STOMP CONNECT frame with the same JWT used for HTTP.
 *
 * <p>The {@code /ws} endpoint is {@code permitAll} at the HTTP layer (SockJS
 * handshake can't carry an Authorization header), so the real auth gate lives
 * here. Crucially we set the session {@link java.security.Principal} name to the
 * user's <b>id</b> — that's the key {@code SimpMessagingTemplate
 * .convertAndSendToUser(userId, "/queue/...")} routes by. Use the email and
 * {@code /user/queue/**} messages would never reach the client.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    RefreshTokenService refreshTokenService;
    UserDetailsServiceImpl userDetailsService;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extractBearerToken(accessor);

            if (token == null) {
                throw new MessagingException("Missing access token on STOMP CONNECT");
            }

            try {
                Jwt jwt = refreshTokenService.decodeAccessToken(token);
                UserPrincipal userDetails =
                        (UserPrincipal) userDetailsService.loadUserByUsername(jwt.getSubject());

                // Principal name = userId → matches convertAndSendToUser(userId, ...)
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails.getId().toString(),
                                null,
                                userDetails.getAuthorities()
                        );

                accessor.setUser(authentication);
            } catch (Exception ex) {
                log.warn("Rejected STOMP CONNECT: {}", ex.getMessage());
                throw new MessagingException("Invalid access token on STOMP CONNECT");
            }
        }

        return message;
    }

    private String extractBearerToken(StompHeaderAccessor accessor) {
        String bearer = accessor.getFirstNativeHeader("Authorization");

        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }

        return null;
    }
}
