package com.example.starter_project_2025.domain.kanji_study.writing_attempt;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.domain.kanji_study.session_item.KanjiSessionItem;
import com.example.starter_project_2025.domain.kanji_study.session_item.KanjiSessionItemRepository;
import com.example.starter_project_2025.exception.BusinessValidationException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetailRepository;
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
public class KanjiWritingAttemptServiceImpl implements KanjiWritingAttemptService {

    KanjiWritingAttemptRepository kanjiWritingAttemptRepository;
    KanjiWritingAttemptMapper kanjiWritingAttemptMapper;
    UserRepository userRepository;
    KanjiDetailRepository kanjiDetailRepository;
    KanjiSessionItemRepository kanjiSessionItemRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiWritingAttemptDTO> getAll(Pageable pageable, String search, KanjiWritingAttemptFilter filter) {

        Specification<KanjiWritingAttempt> spec = Specification.where(notDeleted());

        Specification<KanjiWritingAttempt> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        return kanjiWritingAttemptRepository.findAll(spec, pageable).map(kanjiWritingAttemptMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiWritingAttemptDTO getById(Long id) {
        return kanjiWritingAttemptRepository.findById(id)
                .filter(a -> !Boolean.TRUE.equals(a.getIsDeleted()))
                .map(kanjiWritingAttemptMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji writing attempt not found"));
    }

    @Override
    public KanjiWritingAttemptDTO create(KanjiWritingAttemptDTO request) {

        Map<String, List<String>> errors = new LinkedHashMap<>();

        User user = resolveUser(request.getUserId());
        if (user == null) addError(errors, "userId", "User not found");

        KanjiDetail kanji = kanjiDetailRepository.findById(request.getKanjiId()).orElse(null);
        if (kanji == null) addError(errors, "kanjiId", "Kanji not found");

        KanjiSessionItem sessionItem = null;
        if (request.getSessionItemId() != null) {
            sessionItem = kanjiSessionItemRepository.findById(request.getSessionItemId()).orElse(null);
            if (sessionItem == null) addError(errors, "sessionItemId", "Kanji session item not found");
        }

        if (!errors.isEmpty()) throw new BusinessValidationException(errors);

        KanjiWritingAttempt entity = kanjiWritingAttemptMapper.toEntity(request);
        entity.setUser(user);
        entity.setKanji(kanji);
        entity.setSessionItem(sessionItem);
        if (entity.getPassed() == null) entity.setPassed(false);
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiWritingAttempt saved = kanjiWritingAttemptRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiWritingAttemptMapper.toResponse(saved);
    }

    @Override
    public KanjiWritingAttemptDTO update(Long id, KanjiWritingAttemptDTO request) {

        KanjiWritingAttempt entity = kanjiWritingAttemptRepository.findById(id)
                .filter(a -> !Boolean.TRUE.equals(a.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji writing attempt not found"));

        KanjiWritingAttempt beforeSnapshot = cloneForAudit(entity);

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (request.getSessionItemId() != null
                && (entity.getSessionItem() == null || !request.getSessionItemId().equals(entity.getSessionItem().getId()))) {
            KanjiSessionItem sessionItem = kanjiSessionItemRepository.findById(request.getSessionItemId()).orElse(null);
            if (sessionItem == null) {
                addError(errors, "sessionItemId", "Kanji session item not found");
                throw new BusinessValidationException(errors);
            }
            entity.setSessionItem(sessionItem);
        }

        kanjiWritingAttemptMapper.update(entity, request);

        KanjiWritingAttempt saved = kanjiWritingAttemptRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiWritingAttemptMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiWritingAttempt entity = kanjiWritingAttemptRepository.findById(id)
                .filter(a -> !Boolean.TRUE.equals(a.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji writing attempt not found"));

        entity.setIsDeleted(true);
        KanjiWritingAttempt saved = kanjiWritingAttemptRepository.save(entity);

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

    private Specification<KanjiWritingAttempt> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiWritingAttempt cloneForAudit(KanjiWritingAttempt src) {
        KanjiWritingAttempt copy = new KanjiWritingAttempt();
        copy.setId(src.getId());
        copy.setUser(src.getUser());
        copy.setKanji(src.getKanji());
        copy.setSessionItem(src.getSessionItem());
        copy.setAccuracyScore(src.getAccuracyScore());
        copy.setStrokesDrawn(src.getStrokesDrawn());
        copy.setPassed(src.getPassed());
        copy.setAttemptData(src.getAttemptData());
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
