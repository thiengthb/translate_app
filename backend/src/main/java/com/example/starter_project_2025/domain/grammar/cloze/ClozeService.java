package com.example.starter_project_2025.domain.grammar.cloze;

import com.example.starter_project_2025.domain.grammar.cloze.ClozeDTOs.*;
import com.example.starter_project_2025.domain.grammar.progress.GrammarProgress;
import com.example.starter_project_2025.domain.grammar.progress.GrammarProgressRepository;
import com.example.starter_project_2025.domain.grammar.scheduler.GrammarScheduler;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarker;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarkerRepository;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentence;
import com.example.starter_project_2025.domain.production.grammar.ReferenceSentenceRepository;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Bunpro-style cloze: blank out the grammar span in a reference sentence and grade
 * the learner's fill-in deterministically (no LLM). Near-misses are forgiven for the
 * first couple of tries (a soft "use the right grammar" nudge) before they cost SRS.
 *
 * <p>Self-contained in the grammar module — reads (never writes) the production
 * module's {@link ReferenceSentence} + {@link GrammarMarker}.</p>
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ClozeService {

    private static final String BLANK = "＿＿＿";
    /** Near-miss tries forgiven before it counts as a lapse. */
    private static final int GRACE_ATTEMPTS = 2;

    ReferenceSentenceRepository referenceRepository;
    GrammarMarkerRepository markerRepository;
    GrammarProgressRepository progressRepository;
    GrammarScheduler scheduler;
    UserRepository userRepository;

    // ── Build a cloze question ──
    @Transactional(readOnly = true)
    public ClozeQuestion question(Long subUseId) {
        List<ReferenceSentence> refs = referenceRepository.findApprovedBySubUseId(subUseId);
        if (refs.isEmpty()) refs = referenceRepository.findBySubUseId(subUseId);
        if (refs.isEmpty()) {
            return ClozeQuestion.builder().subUseId(subUseId).hasCloze(false).build();
        }

        ReferenceSentence ref = refs.get(ThreadLocalRandom.current().nextInt(refs.size()));
        GrammarSubUse su = ref.getSubUse();
        String span = locateSpan(ref.getL2Text(), markerCores(subUseId));

        if (span.isEmpty()) {
            return ClozeQuestion.builder()
                    .referenceSentenceId(ref.getId())
                    .subUseId(subUseId)
                    .subUseName(su.getName())
                    .jlptLevel(su.getJlptLevel())
                    .l1Text(ref.getL1Text())
                    .hasCloze(false)
                    .build();
        }

        String masked = mask(ref.getL2Text(), span);
        return ClozeQuestion.builder()
                .referenceSentenceId(ref.getId())
                .subUseId(subUseId)
                .subUseName(su.getName())
                .jlptLevel(su.getJlptLevel())
                .l1Text(ref.getL1Text())
                .masked(masked)
                .blankLength(span.length())
                .hasCloze(true)
                .build();
    }

    // ── Grade an answer ──
    @Transactional
    public ClozeResult review(Long userId, Long referenceSentenceId, String answer, Integer attemptNo) {
        ReferenceSentence ref = referenceRepository.findById(referenceSentenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Reference sentence not found"));
        GrammarSubUse su = ref.getSubUse();
        Long subUseId = su.getId();

        String span = locateSpan(ref.getL2Text(), markerCores(subUseId));
        String na = normalize(answer);
        int attempt = attemptNo != null ? attemptNo : 1;

        Classification cls = classify(na, span, subUseId);

        switch (cls) {
            case CORRECT:
                return applyAndBuild(userId, su, "GOOD", "CORRECT",
                        "Chính xác!", ref, span, false);

            case NEAR_MISS:
                if (attempt <= GRACE_ATTEMPTS) {
                    // Forgiven: no SRS change, let them try again with the right grammar.
                    return ClozeResult.builder()
                            .status("WARN")
                            .canRetry(true)
                            .message("Gần đúng — hãy dùng đúng mẫu ngữ pháp đang ôn cho câu này.")
                            .build();
                }
                return applyAndBuild(userId, su, "AGAIN", "WRONG",
                        "Chưa đúng mẫu cần dùng. Đáp án đúng được hiển thị bên dưới.",
                        ref, span, true);

            default: // WRONG
                return applyAndBuild(userId, su, "AGAIN", "WRONG",
                        "Chưa đúng. Đáp án đúng được hiển thị bên dưới.", ref, span, true);
        }
    }

    private ClozeResult applyAndBuild(Long userId, GrammarSubUse su, String rating, String status,
                                      String message, ReferenceSentence ref, String span, boolean penalized) {
        GrammarProgress progress = progressRepository
                .findByUserIdAndSubUseId(userId, su.getId())
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                    return GrammarProgress.builder().user(user).subUse(su).state("NEW").build();
                });

        scheduler.applyRating(progress, rating);
        progress = progressRepository.save(progress);

        return ClozeResult.builder()
                .status(status)
                .canRetry(false)
                .message(message)
                .correctAnswer(span)
                .fullSentence(ref.getL2Text())
                .ratingApplied(rating)
                .state(progress.getState())
                .intervalDays(progress.getIntervalDays())
                .nextReviewAt(progress.getNextReviewAt())
                .goodPreview(scheduler.previewLabel(progress, "GOOD"))
                .againPreview(scheduler.previewLabel(progress, "AGAIN"))
                .build();
    }

    private enum Classification { CORRECT, NEAR_MISS, WRONG }

    private Classification classify(String na, String span, Long subUseId) {
        if (na.isEmpty()) return Classification.WRONG;

        String nspan = normalize(span);

        // Exact span, or any accepted register/variant marker of THIS sub-use.
        if (na.equals(nspan)) return Classification.CORRECT;
        for (String core : markerCores(subUseId)) {
            if (na.equals(normalize(core))) return Classification.CORRECT;
        }

        // Near-miss 1: same grammar, wrong conjugation / politeness / typo.
        if (!nspan.isEmpty()) {
            int dist = levenshtein(na, nspan);
            int tolerance = Math.max(1, nspan.length() / 3);
            if (dist <= tolerance) return Classification.NEAR_MISS;
            if (longestCommonSubstring(na, nspan).length() >= Math.max(2, nspan.length() / 2)) {
                return Classification.NEAR_MISS;
            }
        }

        // Near-miss 2: a valid grammar marker, but belonging to a DIFFERENT sub-use
        // (learner picked a plausible-but-wrong pattern for this sentence).
        for (GrammarMarker m : markerRepository.findAll()) {
            if (m.getSubUse() == null || subUseId.equals(m.getSubUse().getId())) continue;
            if (na.equals(normalize(m.getMarkerPattern()))) return Classification.NEAR_MISS;
        }

        return Classification.WRONG;
    }

    // ── Span location ──
    private List<String> markerCores(Long subUseId) {
        return markerRepository.findBySubUseId(subUseId).stream()
                .map(GrammarMarker::getMarkerPattern)
                .map(this::stripTilde)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    /** Longest marker core that occurs (exactly, else as longest common substring) in the sentence. */
    private String locateSpan(String sentence, List<String> cores) {
        String best = "";
        for (String core : cores) {
            String found = sentence.contains(core) ? core : longestCommonSubstring(core, sentence);
            if (found.length() >= 2 && found.length() > best.length()) best = found;
        }
        return best;
    }

    private String mask(String sentence, String span) {
        int idx = sentence.indexOf(span);
        if (idx < 0) return sentence;
        return sentence.substring(0, idx) + BLANK + sentence.substring(idx + span.length());
    }

    // ── Text helpers ──
    private String stripTilde(String s) {
        if (s == null) return "";
        return s.replace("～", "").replace("~", "").replaceAll("\\s", "").trim();
    }

    /** Normalize for comparison: drop the tilde, whitespace and JP punctuation. */
    private String normalize(String s) {
        if (s == null) return "";
        return s.replace("～", "").replace("~", "")
                .replaceAll("\\s", "")
                .replaceAll("[。、，．！？!?・…「」『』（）()]", "")
                .trim();
    }

    private int levenshtein(String a, String b) {
        int[] prev = new int[b.length() + 1];
        int[] cur = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) prev[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            cur[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                cur[j] = Math.min(Math.min(cur[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost);
            }
            int[] tmp = prev; prev = cur; cur = tmp;
        }
        return prev[b.length()];
    }

    private String longestCommonSubstring(String a, String b) {
        if (a.isEmpty() || b.isEmpty()) return "";
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        int maxLen = 0, end = 0;
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                    if (dp[i][j] > maxLen) { maxLen = dp[i][j]; end = i; }
                }
            }
        }
        return a.substring(end - maxLen, end);
    }
}
