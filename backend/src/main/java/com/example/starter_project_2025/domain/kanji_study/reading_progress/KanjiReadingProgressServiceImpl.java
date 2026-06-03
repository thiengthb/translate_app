package com.example.starter_project_2025.domain.kanji_study.reading_progress;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.domain.kanji_study.reading_passage.KanjiReadingPassage;
import com.example.starter_project_2025.domain.kanji_study.reading_passage.KanjiReadingPassageRepository;
import com.example.starter_project_2025.domain.kanji_study.reading_set.KanjiReadingSet;
import com.example.starter_project_2025.domain.kanji_study.reading_set.KanjiReadingSetRepository;
import com.example.starter_project_2025.exception.BusinessValidationException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class KanjiReadingProgressServiceImpl implements KanjiReadingProgressService {

    KanjiReadingProgressRepository kanjiReadingProgressRepository;
    KanjiReadingProgressMapper kanjiReadingProgressMapper;
    UserRepository userRepository;
    KanjiReadingSetRepository kanjiReadingSetRepository;
    KanjiReadingPassageRepository kanjiReadingPassageRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiReadingProgressDTO> getAll(Pageable pageable, String search, KanjiReadingProgressFilter filter) {

        Specification<KanjiReadingProgress> spec = Specification.where(notDeleted());

        Specification<KanjiReadingProgress> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        return kanjiReadingProgressRepository.findAll(spec, pageable).map(kanjiReadingProgressMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiReadingProgressDTO getById(Long id) {
        return kanjiReadingProgressRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .map(kanjiReadingProgressMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading progress not found"));
    }

    @Override
    public KanjiReadingProgressDTO create(KanjiReadingProgressDTO request) {

        Map<String, List<String>> errors = new LinkedHashMap<>();

        User user = resolveUser(request.getUserId());
        if (user == null) addError(errors, "userId", "User not found");

        KanjiReadingSet readingSet = kanjiReadingSetRepository.findById(request.getSetId()).orElse(null);
        if (readingSet == null) addError(errors, "setId", "Kanji reading set not found");

        KanjiReadingPassage passage = null;
        if (request.getPassageId() != null) {
            passage = kanjiReadingPassageRepository.findById(request.getPassageId()).orElse(null);
            if (passage == null) addError(errors, "passageId", "Kanji reading passage not found");
        }

        if (!errors.isEmpty()) throw new BusinessValidationException(errors);

        KanjiReadingProgress entity = kanjiReadingProgressMapper.toEntity(request);
        entity.setUser(user);
        entity.setReadingSet(readingSet);
        entity.setPassage(passage);
        if (entity.getStatus() == null) entity.setStatus("NEW");
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiReadingProgress saved = kanjiReadingProgressRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiReadingProgressMapper.toResponse(saved);
    }

    @Override
    public KanjiReadingProgressDTO update(Long id, KanjiReadingProgressDTO request) {

        KanjiReadingProgress entity = kanjiReadingProgressRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading progress not found"));

        KanjiReadingProgress beforeSnapshot = cloneForAudit(entity);

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (request.getSetId() != null && !request.getSetId().equals(entity.getReadingSet().getId())) {
            KanjiReadingSet readingSet = kanjiReadingSetRepository.findById(request.getSetId()).orElse(null);
            if (readingSet == null) {
                addError(errors, "setId", "Kanji reading set not found");
                throw new BusinessValidationException(errors);
            }
            entity.setReadingSet(readingSet);
        }

        if (request.getPassageId() != null
                && (entity.getPassage() == null || !request.getPassageId().equals(entity.getPassage().getId()))) {
            KanjiReadingPassage passage = kanjiReadingPassageRepository.findById(request.getPassageId()).orElse(null);
            if (passage == null) {
                addError(errors, "passageId", "Kanji reading passage not found");
                throw new BusinessValidationException(errors);
            }
            entity.setPassage(passage);
        }

        kanjiReadingProgressMapper.update(entity, request);

        KanjiReadingProgress saved = kanjiReadingProgressRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiReadingProgressMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiReadingProgress entity = kanjiReadingProgressRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading progress not found"));

        entity.setIsDeleted(true);
        KanjiReadingProgress saved = kanjiReadingProgressRepository.save(entity);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    private User resolveUser(Long fromRequest) {
        Long userId = fromRequest;
        if (userId == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
                userId = up.getId();
            }
        }
        if (userId == null) return null;
        return userRepository.findById(userId).orElse(null);
    }

    private Specification<KanjiReadingProgress> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiReadingProgress cloneForAudit(KanjiReadingProgress src) {
        KanjiReadingProgress copy = new KanjiReadingProgress();
        copy.setId(src.getId());
        copy.setUser(src.getUser());
        copy.setReadingSet(src.getReadingSet());
        copy.setPassage(src.getPassage());
        copy.setStatus(src.getStatus());
        copy.setCompletedAt(src.getCompletedAt());
        copy.setIsActive(src.getIsActive());
        copy.setIsDeleted(src.getIsDeleted());
        copy.setVersion(src.getVersion());
        copy.setTenantId(src.getTenantId());
        copy.setCreatedAt(src.getCreatedAt());
        copy.setUpdatedAt(src.getUpdatedAt());
        copy.setCreatedBy(src.getCreatedBy());
        copy.setUpdatedBy(src.getUpdatedBy());
        return copy;
    }
}
