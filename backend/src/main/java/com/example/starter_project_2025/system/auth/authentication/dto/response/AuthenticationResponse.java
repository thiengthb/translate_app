package com.example.starter_project_2025.system.auth.authentication.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Map;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthenticationResponse {

    String accessToken;
    String refreshToken;
    String email;
    String firstName;
    String lastName;
    String role;
    String locale;
    String theme;
    Set<String> roles;
    Set<String> permissions;
    Map<String, Set<String>> rolePermissions;

    /**
     * Set to true on a /login response when the user has 2FA enabled and must
     * complete the TOTP challenge. In that case {@link #accessToken} and
     * {@link #refreshToken} are null and {@link #tempToken} carries the
     * partial-session handle for the follow-up /login/2fa call.
     */
    Boolean requiresTotp;

    String tempToken;
}
