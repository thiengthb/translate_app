package com.example.starter_project_2025.domain.assessment.attempt;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizAttemptQuestionRepository extends BaseCrudRepository<QuizAttemptQuestion, Long> {

    List<QuizAttemptQuestion> findByAttemptIdOrderByOrderIndexAsc(Long attemptId);
}
