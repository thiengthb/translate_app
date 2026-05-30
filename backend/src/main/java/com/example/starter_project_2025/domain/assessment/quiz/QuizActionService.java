package com.example.starter_project_2025.domain.assessment.quiz;

import com.example.starter_project_2025.domain.assessment.quiz_question.QuizQuestionDTO;

import java.util.List;

/**
 * Custom (non-CRUD) quiz operations. Standard CRUD for /api/quizzes is handled by the
 * auto-CRUD framework; this service only adds the extra business actions. Named with an
 * "Action" suffix so it does NOT collide with the framework's `quizService` convention slot.
 */
public interface QuizActionService {

    QuizDTO publish(Long quizId);

    QuizDTO archive(Long quizId);

    QuizDTO duplicate(Long quizId, Long userId);

    List<QuizQuestionDTO> getQuestions(Long quizId);
}
