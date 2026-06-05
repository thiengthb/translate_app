package com.example.starter_project_2025.domain.kanji_study.reading_set;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
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

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class KanjiReadingSetServiceImpl implements KanjiReadingSetService {

    KanjiReadingSetRepository kanjiReadingSetRepository;
    KanjiReadingSetMapper kanjiReadingSetMapper;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiReadingSetDTO> getAll(Pageable pageable, String search, KanjiReadingSetFilter filter) {

        Specification<KanjiReadingSet> spec = Specification.where(notDeleted());

        Specification<KanjiReadingSet> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        Specification<KanjiReadingSet> searchSpec = searchSpec(search);
        if (searchSpec != null) spec = spec.and(searchSpec);

        return kanjiReadingSetRepository.findAll(spec, pageable).map(kanjiReadingSetMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiReadingSetDTO getById(Long id) {
        return kanjiReadingSetRepository.findById(id)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .map(kanjiReadingSetMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading set not found"));
    }

    @Override
    public KanjiReadingSetDTO create(KanjiReadingSetDTO request) {

        KanjiReadingSet entity = kanjiReadingSetMapper.toEntity(request);
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiReadingSet saved = kanjiReadingSetRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiReadingSetMapper.toResponse(saved);
    }

    @Override
    public KanjiReadingSetDTO update(Long id, KanjiReadingSetDTO request) {

        KanjiReadingSet entity = kanjiReadingSetRepository.findById(id)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading set not found"));

        KanjiReadingSet beforeSnapshot = cloneForAudit(entity);

        kanjiReadingSetMapper.update(entity, request);

        KanjiReadingSet saved = kanjiReadingSetRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiReadingSetMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiReadingSet entity = kanjiReadingSetRepository.findById(id)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji reading set not found"));

        entity.setIsDeleted(true);
        KanjiReadingSet saved = kanjiReadingSetRepository.save(entity);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    private Specification<KanjiReadingSet> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private Specification<KanjiReadingSet> searchSpec(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        String like = "%" + keyword.toLowerCase() + "%";
        return (root, query, cb) -> {
            Predicate title = cb.like(cb.lower(root.get("title")), like);
            Predicate desc = cb.like(cb.lower(root.get("description").as(String.class)), like);
            return cb.or(title, desc);
        };
    }

    private KanjiReadingSet cloneForAudit(KanjiReadingSet src) {
        KanjiReadingSet copy = new KanjiReadingSet();
        copy.setId(src.getId());
        copy.setTitle(src.getTitle());
        copy.setDescription(src.getDescription());
        copy.setLevel(src.getLevel());
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
