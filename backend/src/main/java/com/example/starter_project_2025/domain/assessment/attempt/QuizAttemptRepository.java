package com.example.starter_project_2025.domain.assessment.attempt;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizAttemptRepository extends BaseCrudRepository<QuizAttempt, Long> {

    List<QuizAttempt> findByUserIdAndQuizIdAndIsDeletedFalseOrderByStartedAtDesc(Long userId, Long quizId);

    long countByUserIdAndQuizIdAndIsDeletedFalse(Long userId, Long quizId);

    long countByUserIdAndAssignmentIdAndIsDeletedFalse(Long userId, Long assignmentId);

    List<QuizAttempt> findByAssignmentIdAndStatusAndIsDeletedFalse(Long assignmentId, String status);

    List<QuizAttempt> findByAssignmentIdAndIsDeletedFalse(Long assignmentId);
}
