package com.example.starter_project_2025.domain.assessment.quiz;

import com.example.starter_project_2025.domain.assessment.quiz_question.QuizQuestionDTO;
import com.example.starter_project_2025.security.UserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/quizzes")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Quiz", description = "Quiz custom actions: publish, archive, duplicate, questions")
public class QuizController {

    QuizActionService quizActionService;

    @PutMapping("/{quizId}/publish")
    public ResponseEntity<QuizDTO> publish(@PathVariable Long quizId) {
        return ResponseEntity.ok(quizActionService.publish(quizId));
    }

    @PutMapping("/{quizId}/archive")
    public ResponseEntity<QuizDTO> archive(@PathVariable Long quizId) {
        return ResponseEntity.ok(quizActionService.archive(quizId));
    }

    @PostMapping("/{quizId}/duplicate")
    public ResponseEntity<QuizDTO> duplicate(
            @PathVariable Long quizId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(quizActionService.duplicate(quizId, userId));
    }

    /** Copy a public/shared quiz into your own library (deep-copies its questions). */
    @PostMapping("/{quizId}/clone")
    public ResponseEntity<QuizDTO> clone(
            @PathVariable Long quizId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(quizActionService.cloneForUser(quizId, userId));
    }

    @GetMapping("/{quizId}/questions")
    public ResponseEntity<List<QuizQuestionDTO>> questions(@PathVariable Long quizId) {
        return ResponseEntity.ok(quizActionService.getQuestions(quizId));
    }
}
