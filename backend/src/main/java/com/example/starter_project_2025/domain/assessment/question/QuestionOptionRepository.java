package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionOptionRepository extends BaseCrudRepository<QuestionOption, Long> {

    List<QuestionOption> findByQuestionIdOrderByOrderIndexAsc(Long questionId);
}
