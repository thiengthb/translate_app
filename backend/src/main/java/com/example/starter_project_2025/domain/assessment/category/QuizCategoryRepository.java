package com.example.starter_project_2025.domain.assessment.category;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizCategoryRepository extends BaseCrudRepository<QuizCategory, Long> {

    boolean existsByCode(String code);

    List<QuizCategory> findByIsDeletedFalseOrderByOrderIndexAsc();
}
