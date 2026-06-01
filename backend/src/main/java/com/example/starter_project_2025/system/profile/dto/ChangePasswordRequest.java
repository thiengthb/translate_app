package com.example.starter_project_2025.system.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(

        @NotBlank(message = "{validation.currentPassword.required}")
        String currentPassword,

        @NotBlank(message = "{validation.newPassword.required}")
        @Size(min = 8, max = 100, message = "{validation.newPassword.size}")
        String newPassword,

        @NotBlank(message = "{validation.confirmPassword.required}")
        String confirmPassword
) {}
