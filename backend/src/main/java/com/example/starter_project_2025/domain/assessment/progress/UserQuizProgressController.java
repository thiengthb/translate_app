package com.example.starter_project_2025.domain.assessment.progress;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/user-quiz-progress")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "UserQuizProgress", description = "Per-user quiz progress lookup")
public class UserQuizProgressController {

    UserQuizProgressRepository repository;

    /** Certain lookup by (userId, quizId) — returns 204 when no progress exists yet. */
    @GetMapping("/lookup")
    @Transactional(readOnly = true)
    public ResponseEntity<UserQuizProgressDTO> lookup(
            @RequestParam Long userId,
            @RequestParam Long quizId
    ) {
        return repository.findByUserIdAndQuizId(userId, quizId)
                .map(this::toDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    private UserQuizProgressDTO toDto(UserQuizProgress p) {
        UserQuizProgressDTO dto = UserQuizProgressDTO.builder()
                .userId(p.getUserId())
                .quizId(p.getQuizId())
                .attemptCount(p.getAttemptCount())
                .bestAttemptId(p.getBestAttemptId())
                .latestAttemptId(p.getLatestAttemptId())
                .bestScore(p.getBestScore())
                .bestPercentage(p.getBestPercentage())
                .latestScore(p.getLatestScore())
                .latestPercentage(p.getLatestPercentage())
                .firstAttemptAt(p.getFirstAttemptAt())
                .lastAttemptAt(p.getLastAttemptAt())
                .passedAt(p.getPassedAt())
                .status(p.getStatus())
                .build();
        dto.setId(p.getId());
        dto.setIsActive(p.getIsActive());
        return dto;
    }
}
