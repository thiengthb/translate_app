package com.example.starter_project_2025.domain.kanji_study.session_item;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.domain.kanji_study.session.KanjiStudySession;
import com.example.starter_project_2025.domain.kanji_study.session.KanjiStudySessionRepository;
import com.example.starter_project_2025.exception.BusinessValidationException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetailRepository;
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
public class KanjiSessionItemServiceImpl implements KanjiSessionItemService {

    KanjiSessionItemRepository kanjiSessionItemRepository;
    KanjiSessionItemMapper kanjiSessionItemMapper;
    KanjiStudySessionRepository kanjiStudySessionRepository;
    KanjiDetailRepository kanjiDetailRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiSessionItemDTO> getAll(Pageable pageable, String search, KanjiSessionItemFilter filter) {

        Specification<KanjiSessionItem> spec = Specification.where(notDeleted());

        Specification<KanjiSessionItem> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        return kanjiSessionItemRepository.findAll(spec, pageable).map(kanjiSessionItemMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiSessionItemDTO getById(Long id) {
        return kanjiSessionItemRepository.findById(id)
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .map(kanjiSessionItemMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji session item not found"));
    }

    @Override
    public KanjiSessionItemDTO create(KanjiSessionItemDTO request) {

        Map<String, List<String>> errors = new LinkedHashMap<>();

        KanjiStudySession session = kanjiStudySessionRepository.findById(request.getSessionId()).orElse(null);
        if (session == null) addError(errors, "sessionId", "Kanji study session not found");

        KanjiDetail kanji = kanjiDetailRepository.findById(request.getKanjiId()).orElse(null);
        if (kanji == null) addError(errors, "kanjiId", "Kanji not found");

        if (!errors.isEmpty()) throw new BusinessValidationException(errors);

        KanjiSessionItem entity = kanjiSessionItemMapper.toEntity(request);
        entity.setSession(session);
        entity.setKanji(kanji);
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiSessionItem saved = kanjiSessionItemRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiSessionItemMapper.toResponse(saved);
    }

    @Override
    public KanjiSessionItemDTO update(Long id, KanjiSessionItemDTO request) {

        KanjiSessionItem entity = kanjiSessionItemRepository.findById(id)
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji session item not found"));

        KanjiSessionItem beforeSnapshot = cloneForAudit(entity);

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (request.getSessionId() != null && !request.getSessionId().equals(entity.getSession().getId())) {
            KanjiStudySession session = kanjiStudySessionRepository.findById(request.getSessionId()).orElse(null);
            if (session == null) {
                addError(errors, "sessionId", "Kanji study session not found");
                throw new BusinessValidationException(errors);
            }
            entity.setSession(session);
        }

        if (request.getKanjiId() != null && !request.getKanjiId().equals(entity.getKanji().getId())) {
            KanjiDetail kanji = kanjiDetailRepository.findById(request.getKanjiId()).orElse(null);
            if (kanji == null) {
                addError(errors, "kanjiId", "Kanji not found");
                throw new BusinessValidationException(errors);
            }
            entity.setKanji(kanji);
        }

        kanjiSessionItemMapper.update(entity, request);

        KanjiSessionItem saved = kanjiSessionItemRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiSessionItemMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiSessionItem entity = kanjiSessionItemRepository.findById(id)
                .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji session item not found"));

        entity.setIsDeleted(true);
        KanjiSessionItem saved = kanjiSessionItemRepository.save(entity);

        auditLogService.logDelete(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.DELETED));
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    private Specification<KanjiSessionItem> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiSessionItem cloneForAudit(KanjiSessionItem src) {
        KanjiSessionItem copy = new KanjiSessionItem();
        copy.setId(src.getId());
        copy.setSession(src.getSession());
        copy.setKanji(src.getKanji());
        copy.setItemOrder(src.getItemOrder());
        copy.setUserAnswer(src.getUserAnswer());
        copy.setIsCorrect(src.getIsCorrect());
        copy.setResponseTimeMs(src.getResponseTimeMs());
        copy.setStatus(src.getStatus());
        copy.setAnsweredAt(src.getAnsweredAt());
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
