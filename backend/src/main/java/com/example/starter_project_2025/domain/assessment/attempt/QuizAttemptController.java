package com.example.starter_project_2025.domain.assessment.attempt;

import com.example.starter_project_2025.security.UserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/attempts")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "QuizAttempt", description = "Quiz attempt flow: start, answer, submit")
public class QuizAttemptController {

    QuizAttemptService attemptService;

    @PostMapping("/start")
    @PreAuthorize("hasAuthority('QUIZ_ATTEMPT_CREATE')")
    public ResponseEntity<QuizAttemptDTO> start(
            @Valid @RequestBody StartAttemptRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(attemptService.startAttempt(principal.getId(), request));
    }

    @PostMapping("/{attemptId}/answer")
    @PreAuthorize("hasAuthority('QUIZ_ATTEMPT_UPDATE')")
    public ResponseEntity<QuizAttemptDTO> answer(
            @PathVariable Long attemptId,
            @Valid @RequestBody SubmitAnswerRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(attemptService.submitAnswer(principal.getId(), attemptId, request));
    }

    @PostMapping("/{attemptId}/submit")
    @PreAuthorize("hasAuthority('QUIZ_ATTEMPT_UPDATE')")
    public ResponseEntity<QuizAttemptDTO> submit(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(attemptService.submitAttempt(principal.getId(), attemptId));
    }

    @GetMapping("/{attemptId}")
    @PreAuthorize("hasAuthority('QUIZ_ATTEMPT_READ')")
    public ResponseEntity<QuizAttemptDTO> get(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(attemptService.getAttempt(principal.getId(), attemptId));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('QUIZ_ATTEMPT_READ')")
    public ResponseEntity<List<QuizAttemptDTO>> myAttempts(
            @RequestParam Long quizId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(attemptService.getMyAttempts(principal.getId(), quizId));
    }
}
