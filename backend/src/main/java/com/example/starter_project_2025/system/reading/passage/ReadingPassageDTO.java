package com.example.starter_project_2025.system.reading.passage;

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
public class ReadingPassageDTO extends BaseDTO {

    @NotBlank(groups = OnCreate.class, message = "Title is required")
    String title;

    @NotBlank(groups = OnCreate.class, message = "Content is required")
    String content;

    String level;

    String category;

    String summary;

    String imageUrl;

    Integer sortOrder;
}