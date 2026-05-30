package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.OnCreate;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuestionOptionDTO extends BaseDTO {

    Long questionId;

    @NotBlank(groups = OnCreate.class, message = "Content is required")
    String content;

    String contentAudioUrl;

    String contentImageUrl;

    @Builder.Default
    Boolean isCorrect = false;

    String explanation;

    @Builder.Default
    Integer orderIndex = 0;
}
