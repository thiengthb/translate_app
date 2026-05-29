package com.example.starter_project_2025.system.auth.authentication.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
public record RegisterRequest(

        @NotBlank(message = "{validation.email.required}")
        @Email(message = "{validation.email.invalid}", regexp = ".+@.+\\..+")
        String email,

        @NotBlank(message = "{validation.password.required}")
        @Size(min = 8, max = 100, message = "{validation.password.size}")
        String password,

        @NotBlank(message = "{validation.firstName.required}")
        @Size(min = 2, max = 100, message = "{validation.firstName.size}")
        String firstName,

        @NotBlank(message = "{validation.lastName.required}")
        @Size(min = 2, max = 100, message = "{validation.lastName.max}")
        String lastName
) {
}
