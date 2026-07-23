package com.example.starter_project_2025.system.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(

        @NotBlank(message = "{validation.firstName.required}")
        @Size(min = 2, max = 100, message = "{validation.firstName.size}")
        String firstName,

        @Size(max = 100, message = "{validation.lastName.max}")
        String lastName,

        @Size(max = 20, message = "{validation.phone.max}")
        String phone,

        @Size(max = 5, message = "{validation.bio.max}")
        String bio
) {}
