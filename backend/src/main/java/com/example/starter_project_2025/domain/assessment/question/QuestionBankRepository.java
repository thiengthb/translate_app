package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuestionBankRepository extends BaseCrudRepository<QuestionBank, Long> {
}
