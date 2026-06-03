package com.example.starter_project_2025.domain.assessment.tag;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
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

    /* ──────────────────────────────────────────
       Per-user ownership — tags are private to each user. The list is scoped
       to the caller and reads/writes of another user's tag are rejected.
    ────────────────────────────────────────── */

    @Override
    @Transactional(readOnly = true)
    public Page<QuestionTagDTO> getAll(Pageable pageable, String search, QuestionTagFilter filter) {
        QuestionTagFilter scoped = filter != null ? filter : QuestionTagFilter.builder().build();
        Long uid = getCurrentUserId();
        if (uid != null) scoped.createdByUser = uid; // force owner scope (same package)
        return super.getAll(pageable, search, scoped);
    }

    @Override
    @Transactional(readOnly = true)
    public QuestionTagDTO getById(Long id) {
        assertOwned(id);
        return super.getById(id);
    }

    @Override
    public QuestionTagDTO update(Long id, QuestionTagDTO request) {
        assertOwned(id);
        return super.update(id, request);
    }

    @Override
    public void delete(Long id) {
        assertOwned(id);
        super.delete(id);
    }

    private void assertOwned(Long id) {
        Long uid = getCurrentUserId();
        QuestionTag tag = questionTagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tag not found"));
        if (uid != null && !uid.equals(tag.getCreatedByUser())) {
            throw new AccessDeniedException("This tag belongs to another user");
        }
    }

    /* ── Validation: owner + derive/dedupe the code (per user) ── */

    @Override
    protected void beforeCreate(QuestionTag entity, QuestionTagDTO request, ValidationContext ctx) {
        Long uid = getCurrentUserId();
        if (uid != null) entity.setCreatedByUser(uid); // owner = current user
        String code = (request.getCode() != null && !request.getCode().isBlank())
                ? slugify(request.getCode())
                : slugify(request.getName());
        entity.setCode(code);
        if (questionTagRepository.findByCodeAndCreatedByUser(code, entity.getCreatedByUser()).isPresent()) {
            ctx.add("code", "You already have a tag with this code");
        }
    }

    @Override
    protected void beforeUpdate(QuestionTag entity, QuestionTagDTO request, ValidationContext ctx) {
        // Re-slug the code only when the client explicitly sends a new one.
        if (request.getCode() != null && !request.getCode().isBlank()) {
            String code = slugify(request.getCode());
            if (!code.equals(entity.getCode())
                    && questionTagRepository.findByCodeAndCreatedByUser(code, entity.getCreatedByUser())
                        .filter(t -> !t.getId().equals(entity.getId()))
                        .isPresent()) {
                ctx.add("code", "You already have a tag with this code");
                return;
            }
            entity.setCode(code);
        }
    }

    /* ── findOrCreate (scoped to the given user) ── */

    @Override
    public QuestionTagDTO findOrCreate(String name, Long userId) {
        String code = slugify(name);
        QuestionTag tag = questionTagRepository.findByCodeAndCreatedByUser(code, userId)
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
        return input.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
    }
}
