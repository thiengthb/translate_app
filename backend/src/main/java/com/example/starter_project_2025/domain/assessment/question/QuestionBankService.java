package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.service.BaseCrudService;

import java.util.List;

public interface QuestionBankService extends BaseCrudService<Long, QuestionBankDTO, QuestionBankFilter> {

    QuestionOptionDTO addOption(Long questionId, QuestionOptionDTO request);

    void removeOption(Long optionId);

    void reorderOptions(Long questionId, List<Long> orderedOptionIds);

    /** Current content version of a question (for audit / snapshot checks). */
    int getCurrentVersion(Long questionId);

    /* ── Tags ── */

    /** Attach the given tags to a question (idempotent — existing links kept). */
    void addTags(Long questionId, List<Long> tagIds);

    /** Detach a single tag from a question. */
    void removeTag(Long questionId, Long tagId);

    /**
     * Find questions by tags.
     * @param matchAll {@code true} → questions having ALL the tags;
     *                 {@code false} → questions having AT LEAST ONE of the tags
     */
    List<QuestionBankDTO> findByTags(List<Long> tagIds, boolean matchAll);
}
