package com.example.starter_project_2025.domain.classroom.classroom;

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
public class ClassroomDTO extends BaseDTO {

    Long ownerId;

    @NotBlank(groups = OnCreate.class, message = "Name is required")
    String name;

    String description;

    String inviteCode;

    String coverImageUrl;

    Integer maxMembers;

    /** Computed — number of active members. */
    Integer memberCount;
}
