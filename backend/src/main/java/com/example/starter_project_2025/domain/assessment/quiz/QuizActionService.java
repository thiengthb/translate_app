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

    /**
     * Deep-copy a (public/shared) quiz into the given user's library — like cloning a deck.
     * Every referenced question is copied into the user's own question bank so the clone
     * is fully owned and editable by them.
     */
    QuizDTO cloneForUser(Long quizId, Long userId);

    List<QuizQuestionDTO> getQuestions(Long quizId);

    /**
     * Discard a never-published DRAFT quiz: removes the quiz, its question
     * placements, and any questions that were quick-created privately for it.
     * Used when the author cancels the create-quiz wizard.
     */
    void discardDraft(Long quizId, Long userId);
}
