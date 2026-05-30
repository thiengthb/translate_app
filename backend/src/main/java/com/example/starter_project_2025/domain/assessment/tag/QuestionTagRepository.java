package com.example.starter_project_2025.domain.assessment.tag;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionTagRepository extends BaseCrudRepository<QuestionTag, Long> {

    Optional<QuestionTag> findByCode(String code);

    /** System tags (no owner). */
    List<QuestionTag> findByCreatedByUserIsNull();
}
