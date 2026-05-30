package com.example.starter_project_2025.domain.assessment.tag;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuestionTagServiceImpl
        extends BaseCrudServiceImpl<QuestionTag, Long, QuestionTagDTO, QuestionTagFilter>
        implements QuestionTagService {

    QuestionTagMapper questionTagMapper;
    QuestionTagRepository questionTagRepository;

    @Override
    protected BaseCrudRepository<QuestionTag, Long> getRepository() {
        return questionTagRepository;
    }

    @Override
    protected BaseCrudMapper<QuestionTag, QuestionTagDTO> getMapper() {
        return questionTagMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"name", "code"};
    }

    /* ── Validation: derive + dedupe the code ── */

    @Override
    protected void beforeCreate(QuestionTag entity, QuestionTagDTO request, ValidationContext ctx) {
        String code = (request.getCode() != null && !request.getCode().isBlank())
                ? slugify(request.getCode())
                : slugify(request.getName());
        entity.setCode(code);
        if (questionTagRepository.findByCode(code).isPresent()) {
            ctx.add("code", "Tag code already exists");
        }
    }

    @Override
    protected void beforeUpdate(QuestionTag entity, QuestionTagDTO request, ValidationContext ctx) {
        // Re-slug the code only when the client explicitly sends a new one.
        if (request.getCode() != null && !request.getCode().isBlank()) {
            String code = slugify(request.getCode());
            if (!code.equals(entity.getCode())
                    && questionTagRepository.findByCode(code)
                        .filter(t -> !t.getId().equals(entity.getId()))
                        .isPresent()) {
                ctx.add("code", "Tag code already exists");
                return;
            }
            entity.setCode(code);
        }
    }

    /* ── findOrCreate ── */

    @Override
    public QuestionTagDTO findOrCreate(String name, Long userId) {
        String code = slugify(name);
        QuestionTag tag = questionTagRepository.findByCode(code)
                .orElseGet(() -> questionTagRepository.save(
                        QuestionTag.builder()
                                .name(name)
                                .code(code)
                                .createdByUser(userId)
                                .build()));
        return questionTagMapper.toResponse(tag);
    }

    /** Lower-case, collapse non-alphanumerics to single underscores, trim edges. */
    static String slugify(String input) {
        if (input == null) return "";
        String slug = input.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        return slug;
    }
}
