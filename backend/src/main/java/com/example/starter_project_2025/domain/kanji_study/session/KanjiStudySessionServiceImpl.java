package com.example.starter_project_2025.domain.kanji_study.session;

import com.example.starter_project_2025.base.audit.AuditLogService;
import com.example.starter_project_2025.base.crud.spec.AutoSpecBuilder;
import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.domain.kanji_study.deck.KanjiDeck;
import com.example.starter_project_2025.domain.kanji_study.deck.KanjiDeckRepository;
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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class KanjiStudySessionServiceImpl implements KanjiStudySessionService {

    KanjiStudySessionRepository kanjiStudySessionRepository;
    KanjiStudySessionMapper kanjiStudySessionMapper;
    UserRepository userRepository;
    KanjiDeckRepository kanjiDeckRepository;
    AuditLogService auditLogService;
    ApplicationEventPublisher eventPublisher;
    AutoSpecBuilder autoSpecBuilder;

    @Override
    @Transactional(readOnly = true)
    public Page<KanjiStudySessionDTO> getAll(Pageable pageable, String search, KanjiStudySessionFilter filter) {

        Specification<KanjiStudySession> spec = Specification.where(notDeleted());

        Specification<KanjiStudySession> filterSpec = autoSpecBuilder.build(filter);
        if (filterSpec != null) spec = spec.and(filterSpec);

        return kanjiStudySessionRepository.findAll(spec, pageable).map(kanjiStudySessionMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public KanjiStudySessionDTO getById(Long id) {
        return kanjiStudySessionRepository.findById(id)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .map(kanjiStudySessionMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Kanji study session not found"));
    }

    @Override
    public KanjiStudySessionDTO create(KanjiStudySessionDTO request) {

        Map<String, List<String>> errors = new LinkedHashMap<>();

        User user = resolveUser(request.getUserId());
        if (user == null) {
            addError(errors, "userId", "User not found");
            throw new BusinessValidationException(errors);
        }

        KanjiDeck deck = null;
        if (request.getDeckId() != null) {
            deck = kanjiDeckRepository.findById(request.getDeckId()).orElse(null);
            if (deck == null) {
                addError(errors, "deckId", "Kanji deck not found");
                throw new BusinessValidationException(errors);
            }
        }

        KanjiStudySession entity = kanjiStudySessionMapper.toEntity(request);
        entity.setUser(user);
        entity.setDeck(deck);
        if (entity.getStartedAt() == null) entity.setStartedAt(LocalDateTime.now());
        if (entity.getIsActive() == null) entity.setIsActive(true);
        if (entity.getIsDeleted() == null) entity.setIsDeleted(false);

        KanjiStudySession saved = kanjiStudySessionRepository.save(entity);

        auditLogService.logCreate(saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.CREATED));

        return kanjiStudySessionMapper.toResponse(saved);
    }

    @Override
    public KanjiStudySessionDTO update(Long id, KanjiStudySessionDTO request) {

        KanjiStudySession entity = kanjiStudySessionRepository.findById(id)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji study session not found"));

        KanjiStudySession beforeSnapshot = cloneForAudit(entity);

        Map<String, List<String>> errors = new LinkedHashMap<>();

        if (request.getDeckId() != null
                && (entity.getDeck() == null || !request.getDeckId().equals(entity.getDeck().getId()))) {
            KanjiDeck deck = kanjiDeckRepository.findById(request.getDeckId()).orElse(null);
            if (deck == null) {
                addError(errors, "deckId", "Kanji deck not found");
                throw new BusinessValidationException(errors);
            }
            entity.setDeck(deck);
        }

        kanjiStudySessionMapper.update(entity, request);

        KanjiStudySession saved = kanjiStudySessionRepository.save(entity);

        auditLogService.logUpdate(beforeSnapshot, saved);
        eventPublisher.publishEvent(new EntityEvent<>(saved, EntityEvent.EventType.UPDATED));

        return kanjiStudySessionMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {

        KanjiStudySession entity = kanjiStudySessionRepository.findById(id)
                .filter(s -> !Boolean.TRUE.equals(s.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji study session not found"));

        entity.setIsDeleted(true);
        KanjiStudySession saved = kanjiStudySessionRepository.save(entity);

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

    private Specification<KanjiStudySession> notDeleted() {
        return (root, query, cb) -> cb.equal(root.get("isDeleted"), false);
    }

    private static void addError(Map<String, List<String>> errors, String field, String msg) {
        errors.computeIfAbsent(field, k -> new ArrayList<>()).add(msg);
    }

    private KanjiStudySession cloneForAudit(KanjiStudySession src) {
        KanjiStudySession copy = new KanjiStudySession();
        copy.setId(src.getId());
        copy.setUser(src.getUser());
        copy.setDeck(src.getDeck());
        copy.setMode(src.getMode());
        copy.setStartedAt(src.getStartedAt());
        copy.setEndedAt(src.getEndedAt());
        copy.setTotalItems(src.getTotalItems());
        copy.setCompletedItems(src.getCompletedItems());
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
