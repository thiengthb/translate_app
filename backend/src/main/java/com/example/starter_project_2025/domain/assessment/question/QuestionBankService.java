package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.service.BaseCrudService;

import java.util.List;

public interface QuestionBankService extends BaseCrudService<Long, QuestionBankDTO, QuestionBankFilter> {

    QuestionOptionDTO addOption(Long questionId, QuestionOptionDTO request);

    void removeOption(Long optionId);

    void reorderOptions(Long questionId, List<Long> orderedOptionIds);
}
