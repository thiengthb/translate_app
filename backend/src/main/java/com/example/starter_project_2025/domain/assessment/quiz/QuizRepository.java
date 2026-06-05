package com.example.starter_project_2025.domain.assessment.quiz;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizRepository extends BaseCrudRepository<Quiz, Long> {

    List<Quiz> findByCreatorIdAndIsDeletedFalse(Long creatorId);

    List<Quiz> findByVisibilityAndStatusAndIsDeletedFalse(String visibility, String status);

    boolean existsByCode(String code);
}
