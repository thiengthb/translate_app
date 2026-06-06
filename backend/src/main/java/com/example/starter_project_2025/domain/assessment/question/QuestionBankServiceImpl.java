package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.assessment.tag.QuestionTag;
import com.example.starter_project_2025.domain.assessment.tag.QuestionTagRepository;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

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
    QuestionTagRepository questionTagRepository;

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

    /* ──────────────────────────────────────────
       Per-user ownership — the question bank is private to each user.
       List is scoped to the caller; reads/writes of someone else's question
       are rejected. (Quiz attempts read questions internally by id, bypassing
       this service, so public/cloned quizzes still work.)
    ────────────────────────────────────────── */

    @Override
    @Transactional(readOnly = true)
    public Page<QuestionBankDTO> getAll(Pageable pageable, String search, QuestionBankFilter filter) {
        checkPermission(com.example.starter_project_2025.base.crud.CrudAction.READ);
        QuestionBankFilter scoped = filter != null ? filter : QuestionBankFilter.builder().build();
        Long uid = getCurrentUserId();

        // Owner-quiz scoping is OR/IS-NULL logic that the generic equality filter
        // can't express, so build the spec here and let autoSpecBuilder handle the
        // remaining plain-equality fields (questionType, difficultyLevel, …).
        Long ownerQuizId = scoped.ownerQuizId;
        scoped.ownerQuizId = null;                 // don't let it reach the auto-builder
        if (uid != null) scoped.createdByUser = uid; // per-user bank

        Specification<QuestionBank> spec = Specification.where((root, q, cb) -> cb.equal(root.get("isDeleted"), false));
        if (ownerQuizId != null) {
            // Quiz wizard: shared questions + this quiz's private ones.
            Long oq = ownerQuizId;
            spec = spec.and((root, q, cb) ->
                    cb.or(cb.isNull(root.get("ownerQuizId")), cb.equal(root.get("ownerQuizId"), oq)));
        } else {
            // Shared bank only: hide every quiz-private question.
            spec = spec.and((root, q, cb) -> cb.isNull(root.get("ownerQuizId")));
        }

        Specification<QuestionBank> filterSpec = autoSpecBuilder.build(scoped);
        if (filterSpec != null) spec = spec.and(filterSpec);

        String keyword = search != null ? search.trim() : "";
        if (!keyword.isEmpty()) {
            String like = "%" + keyword.toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> cb.like(cb.lower(root.get("prompt")), like));
        }

        return questionBankRepository.findAll(spec, pageable)
                .map(entity -> afterRead(questionBankMapper.toResponse(entity), entity));
    }

    @Override
    @Transactional(readOnly = true)
    public QuestionBankDTO getById(Long id) {
        assertOwned(id);
        return super.getById(id);
    }

    @Override
    public QuestionBankDTO update(Long id, QuestionBankDTO request) {
        assertOwned(id);
        return super.update(id, request);
    }

    @Override
    public void delete(Long id) {
        assertOwned(id);
        super.delete(id);
    }

    /** Reject access to a question the current user does not own. */
    private void assertOwned(Long id) {
        Long uid = getCurrentUserId();
        QuestionBank q = questionBankRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found"));
        if (uid != null && !uid.equals(q.getCreatedByUser())) {
            throw new AccessDeniedException("This question belongs to another user");
        }
    }

    /* ── Lifecycle hooks: build / replace options ── */

    @Override
    protected void beforeCreate(QuestionBank entity, QuestionBankDTO request, ValidationContext ctx) {
        Long uid = getCurrentUserId();
        if (uid != null) entity.setCreatedByUser(uid); // owner = current user
        // Questions quick-created in the quiz wizard are private to that quiz.
        entity.setOwnerQuizId(request.getOwnerQuizId());
        entity.setOptions(buildOptions(entity, request));
        if (request.getTagIds() != null) {
            entity.setTags(resolveTags(request.getTagIds()));
        }
    }

    @Override
    protected void beforeUpdate(QuestionBank entity, QuestionBankDTO request, ValidationContext ctx) {
        // beforeUpdate runs BEFORE the mapper copies the request onto the entity,
        // so `entity` still holds the persisted values and `request` the incoming
        // ones — perfect for an old-vs-new diff.
        //
        // Only bump the content version when something that actually changes what
        // the student sees / is graded on changes: prompt, prompt media, hint,
        // explanation, question type, or the options (content + correct answer).
        // Pure metadata edits (category, level, difficulty, default score,
        // is_active, tags) must NOT bump it — that version guards in-flight
        // attempt snapshots.
        boolean contentChanged =
                contentFieldChanged(request.getPrompt(),          entity.getPrompt())
             || contentFieldChanged(request.getQuestionType(),    entity.getQuestionType())
             || contentFieldChanged(request.getPromptAudioUrl(),  entity.getPromptAudioUrl())
             || contentFieldChanged(request.getPromptImageUrl(),  entity.getPromptImageUrl())
             || contentFieldChanged(request.getHint(),            entity.getHint())
             || contentFieldChanged(request.getExplanation(),     entity.getExplanation())
             || optionsChanged(entity, request.getOptions());

        // Replace the option set when the client provided one.
        if (request.getOptions() != null) {
            entity.getOptions().clear();
            entity.getOptions().addAll(buildOptions(entity, request));
        }

        // Tags are metadata — replacing them never bumps the content version.
        if (request.getTagIds() != null) {
            entity.getTags().clear();
            entity.getTags().addAll(resolveTags(request.getTagIds()));
        }

        if (contentChanged) {
            entity.setContentVersion(entity.getContentVersion() + 1);
        }
    }

    private Set<QuestionTag> resolveTags(List<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) return new HashSet<>();
        return new HashSet<>(questionTagRepository.findAllById(tagIds));
    }

    /** A string field counts as changed only when the request carries a new,
     *  non-null value that differs from the persisted one (null means
     *  "not provided" under partial-update semantics). */
    private static boolean contentFieldChanged(String incoming, String current) {
        return incoming != null && !Objects.equals(incoming, current);
    }

    /** True when the submitted options differ from the persisted ones in any
     *  content-affecting way: text, media, correctness, or ordering. */
    private boolean optionsChanged(QuestionBank entity, List<QuestionOptionDTO> incoming) {
        if (incoming == null) return false; // not provided → no change

        List<String> current = entity.getOptions().stream()
                .filter(o -> !Boolean.TRUE.equals(o.getIsDeleted()))
                .sorted(Comparator.comparingInt(QuestionOption::getOrderIndex))
                .map(QuestionBankServiceImpl::optionSignature)
                .collect(Collectors.toList());

        return !current.equals(incomingSignatures(incoming));
    }

    private static List<String> incomingSignatures(List<QuestionOptionDTO> incoming) {
        List<Map.Entry<Integer, String>> entries = new ArrayList<>();
        int fallback = 0;
        for (QuestionOptionDTO d : incoming) {
            int order = d.getOrderIndex() != null ? d.getOrderIndex() : fallback;
            entries.add(Map.entry(order, optionSignature(
                    d.getContent(), d.getContentAudioUrl(), d.getContentImageUrl(),
                    Boolean.TRUE.equals(d.getIsCorrect()), order)));
            fallback++;
        }
        entries.sort(Comparator.comparingInt(Map.Entry::getKey));
        return entries.stream().map(Map.Entry::getValue).collect(Collectors.toList());
    }

    private static String optionSignature(QuestionOption o) {
        return optionSignature(o.getContent(), o.getContentAudioUrl(),
                o.getContentImageUrl(), o.isCorrect(), o.getOrderIndex());
    }

    private static String optionSignature(String content, String audio, String image,
                                          boolean correct, int order) {
        return order + "|" + correct + "|" + nz(content) + "|" + nz(audio) + "|" + nz(image);
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    /** Bump and persist the parent question's content version. */
    private void bumpVersion(QuestionBank question) {
        question.setContentVersion(question.getContentVersion() + 1);
        questionBankRepository.save(question);
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

        // Adding an option changes the question's content (and possibly the
        // correct answer) → bump the parent's content version.
        bumpVersion(question);

        return questionBankMapper.optionToDto(saved);
    }

    @Override
    public void removeOption(Long optionId) {
        QuestionOption option = questionOptionRepository.findById(optionId)
                .orElseThrow(() -> new ResourceNotFoundException("Option not found"));
        option.setIsDeleted(true);
        questionOptionRepository.save(option);

        // Removing an option changes content → bump the parent's content version.
        if (option.getQuestion() != null) {
            bumpVersion(option.getQuestion());
        }
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

        // Re-ordering changes the correct answer for ORDERING-type questions and
        // the presentation for the rest → bump the parent's content version.
        questionBankRepository.findById(questionId).ifPresent(this::bumpVersion);
    }

    /* ── Version (audit) ── */

    @Override
    @Transactional(readOnly = true)
    public int getCurrentVersion(Long questionId) {
        QuestionBank question = questionBankRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found"));
        return question.getContentVersion();
    }

    /* ── Tags ── */

    @Override
    public void addTags(Long questionId, List<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) return;
        QuestionBank question = questionBankRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found"));
        List<QuestionTag> tags = questionTagRepository.findAllById(tagIds);
        question.getTags().addAll(tags);
        questionBankRepository.save(question);
        // Tags are metadata for filtering — they do NOT affect the content version.
    }

    @Override
    public void removeTag(Long questionId, Long tagId) {
        QuestionBank question = questionBankRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found"));
        question.getTags().removeIf(t -> t.getId().equals(tagId));
        questionBankRepository.save(question);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuestionBankDTO> findByTags(List<Long> tagIds, boolean matchAll) {
        if (tagIds == null || tagIds.isEmpty()) return List.of();
        List<Long> distinct = tagIds.stream().distinct().collect(Collectors.toList());
        List<QuestionBank> questions = matchAll
                ? questionBankRepository.findByAllTagIds(distinct, distinct.size())
                : questionBankRepository.findByAnyTagIds(distinct);
        Long uid = getCurrentUserId();
        return questions.stream()
                // Per-user bank + hide quiz-private questions from the tag browser.
                .filter(q -> uid == null || uid.equals(q.getCreatedByUser()))
                .filter(q -> q.getOwnerQuizId() == null)
                .map(q -> afterRead(questionBankMapper.toResponse(q), q))
                .collect(Collectors.toList());
    }
}
