package com.example.starter_project_2025.domain.assessment.tag;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionTagRepository extends BaseCrudRepository<QuestionTag, Long> {

    Optional<QuestionTag> findByCode(String code);

    /** A user's own tag by code (codes are unique per owner). */
    Optional<QuestionTag> findByCodeAndCreatedByUser(String code, Long createdByUser);

    /** A system tag (no owner) by code. */
    Optional<QuestionTag> findByCodeAndCreatedByUserIsNull(String code);

    /** System tags (no owner). */
    List<QuestionTag> findByCreatedByUserIsNull();
}
