package com.example.starter_project_2025.domain.classroom.member;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ClassMemberDTO extends BaseDTO {

    Long classroomId;
    Long userId;
    String role;
    String joinedVia;
    LocalDateTime joinedAt;

    /** Enriched from the User record. */
    String displayName;
    String avatarUrl;
}
