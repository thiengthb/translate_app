package com.example.starter_project_2025.base.i18n;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TranslationDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Locale is required")
    @Size(max = 10, message = "Locale must not exceed 10 characters")
    String locale;

    @NotBlank(groups = OnCreate.class, message = "Message key is required")
    @Size(max = 200, message = "Message key must not exceed 200 characters")
    String messageKey;

    @NotBlank(groups = OnCreate.class, message = "Message value is required")
    String messageValue;

    @Size(max = 100, message = "Category must not exceed 100 characters")
    String category;
}
