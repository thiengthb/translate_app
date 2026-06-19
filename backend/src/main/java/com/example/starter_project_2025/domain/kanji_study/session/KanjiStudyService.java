package com.example.starter_project_2025.domain.kanji_study.session;

import com.example.starter_project_2025.domain.kanji_study.deck.KanjiDeck;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import com.example.starter_project_2025.domain.kanji_study.progress.KanjiProgress;
import com.example.starter_project_2025.domain.kanji_study.session_item.KanjiSessionItem;
import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Cross-entity write/read logic for a finished kanji study session (the
 * "save option" + stats of the quiz feature). Kept out of the auto-CRUD
 * {@code KanjiStudySessionServiceImpl} because it touches three tables at once:
 *
 * <ul>
 *   <li>{@link #submit} — persist a {@link KanjiStudySession} + one
 *       {@link KanjiSessionItem} per answered kanji, and roll the result into
 *       per-kanji {@link KanjiProgress} (counts + light SRS);</li>
 *   <li>{@link #stats} — per deck/group aggregates for the setup header
 *       (last studied, quiz count, accuracy).</li>
 * </ul>
 */
@Service
@Transactional
public class KanjiStudyService {

    @PersistenceContext
    private EntityManager em;

    public record SubmitItem(Long kanjiId, Boolean correct) {}

    public record SubmitRequest(Long deckId, Integer groupIndex, String mode,
                                LocalDateTime startedAt, List<SubmitItem> items) {}

    public record SubmitResult(Long sessionId, int correct, int total, int accuracy) {}

    public record StatsResult(LocalDateTime lastStudiedAt, int quizCount, int accuracy) {}

    public record RecentSession(Long sessionId, Long deckId, String deckTitle, Integer groupIndex,
                                String mode, int totalItems, int correctItems, int accuracy,
                                LocalDateTime endedAt) {}

    /* ── submit (save a finished session) ────────────────────────── */

    public SubmitResult submit(SubmitRequest req) {
        Long userId = currentUserId();
        if (userId == null) {
            throw new com.example.starter_project_2025.exception.ResourceNotFoundException("User not authenticated");
        }
        LocalDateTime now = LocalDateTime.now();
        List<SubmitItem> items = req.items() != null ? req.items() : List.of();
        int total = items.size();
        int correct = (int) items.stream().filter(i -> Boolean.TRUE.equals(i.correct())).count();

        KanjiStudySession session = new KanjiStudySession();
        session.setUser(em.getReference(User.class, userId));
        if (req.deckId() != null) session.setDeck(em.getReference(KanjiDeck.class, req.deckId()));
        session.setMode(req.mode() != null && !req.mode().isBlank() ? req.mode() : "QUIZ");
        session.setGroupIndex(req.groupIndex());
        session.setStartedAt(req.startedAt() != null ? req.startedAt() : now);
        session.setEndedAt(now);
        session.setTotalItems(total);
        session.setCompletedItems(total);
        session.setCorrectItems(correct);
        session.setIsActive(true);
        session.setIsDeleted(false);
        em.persist(session);

        int order = 0;
        for (SubmitItem it : items) {
            if (it.kanjiId() == null) continue;
            boolean ok = Boolean.TRUE.equals(it.correct());

            KanjiSessionItem si = new KanjiSessionItem();
            si.setSession(session);
            si.setKanji(em.getReference(KanjiDetail.class, it.kanjiId()));
            si.setItemOrder(order++);
            si.setIsCorrect(ok);
            si.setStatus(ok ? "CORRECT" : "WRONG");
            si.setAnsweredAt(now);
            si.setIsActive(true);
            si.setIsDeleted(false);
            em.persist(si);

            updateProgress(userId, it.kanjiId(), ok, now);
        }

        int accuracy = total > 0 ? (int) Math.round(correct * 100.0 / total) : 0;
        return new SubmitResult(session.getId(), correct, total, accuracy);
    }

    /** Upsert per-(user,kanji) progress with a light SM-2-ish schedule. */
    private void updateProgress(Long userId, Long kanjiId, boolean correct, LocalDateTime now) {
        KanjiProgress p = em.createQuery(
                        "SELECT p FROM KanjiProgress p WHERE p.user.id = :u AND p.kanji.id = :k AND p.isDeleted = false",
                        KanjiProgress.class)
                .setParameter("u", userId)
                .setParameter("k", kanjiId)
                .setMaxResults(1)
                .getResultList().stream().findFirst().orElse(null);

        boolean isNew = p == null;
        if (isNew) {
            p = new KanjiProgress();
            p.setUser(em.getReference(User.class, userId));
            p.setKanji(em.getReference(KanjiDetail.class, kanjiId));
            p.setIsActive(true);
            p.setIsDeleted(false);
        }

        if (correct) {
            p.setCorrectCount(p.getCorrectCount() + 1);
            int interval = p.getIntervalDays() <= 0 ? 1 : (int) Math.round(p.getIntervalDays() * p.getEaseFactor());
            p.setIntervalDays(interval);
            p.setNextReviewAt(now.plusDays(interval));
        } else {
            p.setWrongCount(p.getWrongCount() + 1);
            p.setIntervalDays(0);
            p.setNextReviewAt(now.plusDays(1));
        }
        p.setLastStudiedAt(now);
        // Proficiency ladder (mirrors the FE "Tiến độ Hán tự" levels). The top
        // level — MASTERED ("Thành thạo") — is reserved for the Challenges
        // feature: ordinary study never grants it, and never demotes a kanji
        // that has already reached it.
        if (!"MASTERED".equalsIgnoreCase(p.getStatus())) {
            p.setStatus(proficiencyFor(p.getCorrectCount(), p.getWrongCount()));
        }

        if (isNew) em.persist(p);
    }

    /**
     * Map cumulative correct/wrong counts onto the four study-reachable
     * proficiency levels (net = correct − wrong). The fifth level,
     * {@code MASTERED} ("Thành thạo"), is awarded only by the Challenges
     * feature, never here.
     *
     * <ul>
     *   <li>{@code NEW}        — "Chưa biết": net ≤ 0 (seen but still missing it)</li>
     *   <li>{@code KNOWN}      — "Đã biết":   net 1–2</li>
     *   <li>{@code FAMILIAR}   — "Đã quen":   net 3–5</li>
     *   <li>{@code PROFICIENT} — "Biết rõ":   net ≥ 6</li>
     * </ul>
     */
    private static String proficiencyFor(int correctCount, int wrongCount) {
        int net = correctCount - wrongCount;
        if (net <= 0) return "NEW";
        if (net <= 2) return "KNOWN";
        if (net <= 5) return "FAMILIAR";
        return "PROFICIENT";
    }

    /* ── stats (setup header) ────────────────────────────────────── */

    @Transactional(readOnly = true)
    public StatsResult stats(Long deckId, Integer groupIndex, String mode) {
        Long userId = currentUserId();
        if (userId == null) return new StatsResult(null, 0, 0);

        // Default to QUIZ so the existing Trắc nghiệm header keeps working; the
        // writing setup screen passes mode=WRITING for its own "Viết" count.
        String modeFilter = mode != null && !mode.isBlank() ? mode : "QUIZ";

        StringBuilder where = new StringBuilder(
                "WHERE s.user.id = :u AND s.isDeleted = false AND s.mode = :mode");
        if (deckId != null) where.append(" AND s.deck.id = :deckId");
        if (groupIndex != null) where.append(" AND s.groupIndex = :groupIndex");

        var query = em.createQuery(
                "SELECT COUNT(s), MAX(s.endedAt), COALESCE(SUM(s.correctItems), 0), COALESCE(SUM(s.totalItems), 0) "
                        + "FROM KanjiStudySession s " + where, Object[].class)
                .setParameter("u", userId)
                .setParameter("mode", modeFilter);
        if (deckId != null) query.setParameter("deckId", deckId);
        if (groupIndex != null) query.setParameter("groupIndex", groupIndex);

        Object[] row = query.getSingleResult();
        int quizCount = ((Number) row[0]).intValue();
        LocalDateTime last = (LocalDateTime) row[1];
        long sumCorrect = ((Number) row[2]).longValue();
        long sumTotal = ((Number) row[3]).longValue();
        int accuracy = sumTotal > 0 ? (int) Math.round(sumCorrect * 100.0 / sumTotal) : 0;
        return new StatsResult(last, quizCount, accuracy);
    }

    /* ── recent sessions (home screen) ───────────────────────────── */

    @Transactional(readOnly = true)
    public List<RecentSession> recent(int limit) {
        Long userId = currentUserId();
        if (userId == null) return List.of();

        List<Object[]> rows = em.createQuery("""
                        SELECT s.id, d.id, d.title, s.groupIndex, s.mode, s.totalItems, s.correctItems, s.endedAt
                        FROM KanjiStudySession s LEFT JOIN s.deck d
                        WHERE s.user.id = :u AND s.isDeleted = false
                        ORDER BY s.endedAt DESC, s.id DESC
                        """, Object[].class)
                .setParameter("u", userId)
                .setMaxResults(Math.min(Math.max(limit, 1), 20))
                .getResultList();

        List<RecentSession> out = new ArrayList<>();
        for (Object[] r : rows) {
            int total = r[5] != null ? ((Number) r[5]).intValue() : 0;
            int correct = r[6] != null ? ((Number) r[6]).intValue() : 0;
            int acc = total > 0 ? (int) Math.round(correct * 100.0 / total) : 0;
            out.add(new RecentSession(
                    (Long) r[0], (Long) r[1], (String) r[2], (Integer) r[3], (String) r[4],
                    total, correct, acc, (LocalDateTime) r[7]));
        }
        return out;
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) return up.getId();
        return null;
    }
}
