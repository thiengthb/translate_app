package com.example.starter_project_2025.domain.assessment.quiz_question;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizQuestionRepository extends BaseCrudRepository<QuizQuestion, Long> {

    List<QuizQuestion> findByQuizIdAndIsDeletedFalseOrderByOrderIndexAsc(Long quizId);

    long countByQuizIdAndIsDeletedFalse(Long quizId);
}
