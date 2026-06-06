package com.example.starter_project_2025.domain.classroom.assignment;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StudentResultDTO {

    Long userId;
    String displayName;
    Integer attemptCount;
    Double bestScore;
    Double latestScore;
    Boolean isPassed;
    LocalDateTime submittedAt;

    /** Every attempt this student made (all statuses), ordered oldest → newest. */
    @Builder.Default
    List<AttemptSummaryDTO> attempts = new ArrayList<>();
}
