package com.example.starter_project_2025.domain.kanji_study.reading_passage;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.domain.kanji_study.reading_set.KanjiReadingSet;
import com.example.starter_project_2025.domain.kanji_study.reading_set.KanjiReadingSetRepository;
import com.example.starter_project_2025.exception.BusinessValidationException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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
public class KanjiReadingPassageServiceImpl implements KanjiReadingPassageService {

    KanjiReadingPassageRepository kanjiReadingPassageRepository;
    KanjiReadingPassageMapper kanjiReadingPassageMapper;
    KanjiReadingSetRepository kanjiReadingSetRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiReadingPassageDTO> getAll(Pageable pageable, String search, KanjiReadingPassageFilter filter) {

        Specification<KanjiReadingPassage> spec = Specification.where(notDeleted());

        Specification<KanjiReadingPassage> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        Specification<KanjiReadingPassage> searchSpec = searchSpec(search);
        if (searchSpec != null) spec = spec.and(searchSpec);

        return kanjiReadingPassageRepository.findAll(spec, pageable).map(kanjiReadingPassageMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiReadingPassageDTO getById(Long id) {
        return kanjiReadingPassageRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .map(kanjiReadingPassageMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading passage not found"));
    }

    @Override
    public KanjiReadingPassageDTO create(KanjiReadingPassageDTO request) {

        Map<String, List<String>> errors = new LinkedHashMap<>();

        KanjiReadingSet readingSet = kanjiReadingSetRepository.findById(request.getSetId()).orElse(null);
        if (readingSet == null) {
            addError(errors, "setId", "Kanji reading set not found");
            throw new BusinessValidationException(errors);
        }

        KanjiReadingPassage entity = kanjiReadingPassageMapper.toEntity(request);
        entity.setReadingSet(readingSet);
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiReadingPassage saved = kanjiReadingPassageRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiReadingPassageMapper.toResponse(saved);
    }

    @Override
    public KanjiReadingPassageDTO update(Long id, KanjiReadingPassageDTO request) {

        KanjiReadingPassage entity = kanjiReadingPassageRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading passage not found"));

        KanjiReadingPassage beforeSnapshot = cloneForAudit(entity);

        if (request.getSetId() != null && !request.getSetId().equals(entity.getReadingSet().getId())) {
            Map<String, List<String>> errors = new LinkedHashMap<>();
            KanjiReadingSet readingSet = kanjiReadingSetRepository.findById(request.getSetId()).orElse(null);
            if (readingSet == null) {
                addError(errors, "setId", "Kanji reading set not found");
                throw new BusinessValidationException(errors);
            }
            entity.setReadingSet(readingSet);
        }

        kanjiReadingPassageMapper.update(entity, request);

        KanjiReadingPassage saved = kanjiReadingPassageRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiReadingPassageMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiReadingPassage entity = kanjiReadingPassageRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading passage not found"));

        entity.setIsDeleted(true);
        KanjiReadingPassage saved = kanjiReadingPassageRepository.save(entity);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    private Specification<KanjiReadingPassage> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private Specification<KanjiReadingPassage> searchSpec(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String like = "%" + keyword.toLowerCase() + "%";
        return (root, query, cb) -> {
            Predicate content = cb.like(cb.lower(root.get("content").as(String.class)), like);
            Predicate trans = cb.like(cb.lower(root.get("translationVi").as(String.class)), like);
            return cb.or(content, trans);
        };
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiReadingPassage cloneForAudit(KanjiReadingPassage src) {
        KanjiReadingPassage copy = new KanjiReadingPassage();
        copy.setId(src.getId());
        copy.setReadingSet(src.getReadingSet());
        copy.setContent(src.getContent());
        copy.setFurigana(src.getFurigana());
        copy.setTranslationVi(src.getTranslationVi());
        copy.setOrderIndex(src.getOrderIndex());
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
