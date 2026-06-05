package com.example.starter_project_2025.domain.assessment.tag;

import com.example.starter_project_2025.base.crud.service.BaseCrudService;

public interface QuestionTagService extends BaseCrudService<Long, QuestionTagDTO, QuestionTagFilter> {

    /**
     * Find a tag by its slug (derived from {@code name}); create it if missing.
     * @param userId owner for a newly-created tag ({@code null} → system tag)
     */
    QuestionTagDTO findOrCreate(String name, Long userId);
}
