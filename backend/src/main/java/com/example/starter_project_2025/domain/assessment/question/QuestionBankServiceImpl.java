package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuestionBankServiceImpl
        extends BaseCrudServiceImpl<QuestionBank, Long, QuestionBankDTO, QuestionBankFilter>
        implements QuestionBankService {

    QuestionBankMapper questionBankMapper;
    QuestionBankRepository questionBankRepository;
    QuestionOptionRepository questionOptionRepository;

    @Override
    protected BaseCrudRepository<QuestionBank, Long> getRepository() {
        return questionBankRepository;
    }

    @Override
    protected BaseCrudMapper<QuestionBank, QuestionBankDTO> getMapper() {
        return questionBankMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"prompt"};
    }

    /* ── Lifecycle hooks: build / replace options ── */

    @Override
    protected void beforeCreate(QuestionBank entity, QuestionBankDTO request, ValidationContext ctx) {
        entity.setOptions(buildOptions(entity, request));
    }

    @Override
    protected void beforeUpdate(QuestionBank entity, QuestionBankDTO request, ValidationContext ctx) {
        if (request.getOptions() == null) return;
        entity.getOptions().clear();
        entity.getOptions().addAll(buildOptions(entity, request));
        entity.setContentVersion(entity.getContentVersion() + 1);
    }

    private List<QuestionOption> buildOptions(QuestionBank parent, QuestionBankDTO request) {
        List<QuestionOption> result = new ArrayList<>();
        if (request.getOptions() == null) return result;
        int order = 0;
        for (QuestionOptionDTO dto : request.getOptions()) {
            QuestionOption option = QuestionOption.builder()
                    .question(parent)
                    .content(dto.getContent())
                    .contentAudioUrl(dto.getContentAudioUrl())
                    .contentImageUrl(dto.getContentImageUrl())
                    .isCorrect(Boolean.TRUE.equals(dto.getIsCorrect()))
                    .explanation(dto.getExplanation())
                    .orderIndex(dto.getOrderIndex() != null ? dto.getOrderIndex() : order)
                    .build();
            result.add(option);
            order++;
        }
        return result;
    }

    /* ── Option sub-resource operations ── */

    @Override
    public QuestionOptionDTO addOption(Long questionId, QuestionOptionDTO request) {
        QuestionBank question = questionBankRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found"));

        QuestionOption option = QuestionOption.builder()
                .question(question)
                .content(request.getContent())
                .contentAudioUrl(request.getContentAudioUrl())
                .contentImageUrl(request.getContentImageUrl())
                .isCorrect(Boolean.TRUE.equals(request.getIsCorrect()))
                .explanation(request.getExplanation())
                .orderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0)
                .build();

        QuestionOption saved = questionOptionRepository.save(option);
        return questionBankMapper.optionToDto(saved);
    }

    @Override
    public void removeOption(Long optionId) {
        QuestionOption option = questionOptionRepository.findById(optionId)
                .orElseThrow(() -> new ResourceNotFoundException("Option not found"));
        option.setIsDeleted(true);
        questionOptionRepository.save(option);
    }

    @Override
    public void reorderOptions(Long questionId, List<Long> orderedOptionIds) {
        if (orderedOptionIds == null || orderedOptionIds.isEmpty()) return;
        List<QuestionOption> options = questionOptionRepository.findByQuestionIdOrderByOrderIndexAsc(questionId);
        Map<Long, QuestionOption> byId = new HashMap<>();
        for (QuestionOption o : options) byId.put(o.getId(), o);
        for (int i = 0; i < orderedOptionIds.size(); i++) {
            QuestionOption o = byId.get(orderedOptionIds.get(i));
            if (o != null) o.setOrderIndex(i);
        }
        questionOptionRepository.saveAll(options);
    }
}
