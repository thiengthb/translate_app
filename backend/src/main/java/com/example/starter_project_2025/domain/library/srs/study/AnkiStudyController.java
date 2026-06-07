package com.example.starter_project_2025.domain.library.srs.study;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.deck_item.DeckItemRepository;
import com.example.starter_project_2025.domain.library.flashcard.ContentType;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardSide;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardSideContent;
import com.example.starter_project_2025.domain.library.flashcard.SideType;
import com.example.starter_project_2025.domain.library.srs.srs_setting.AnkiSrsSetting;
import com.example.starter_project_2025.domain.library.srs.srs_setting.AnkiSrsSettingRepository;
import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgress;
import com.example.starter_project_2025.domain.library.srs.srs_progress.AnkiSrsProgressRepository;
import com.example.starter_project_2025.domain.library.srs.study.scheduler.PreviewResult;
import com.example.starter_project_2025.domain.library.srs.study.scheduler.Rating;
import com.example.starter_project_2025.domain.library.srs.study.scheduler.SchedulerFactory;
import com.example.starter_project_2025.domain.library.srs.study.scheduler.SchedulingConfig;
import com.example.starter_project_2025.domain.library.srs.study.scheduler.SrsScheduler;
import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/anki/study")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "AnkiStudy", description = "Anki SRS study session APIs (SM-2 today; FSRS is a future enhancement)")
public class AnkiStudyController {

    /** Anki-style learn-ahead window (minutes): learning/relearning cards whose
     *  next step is due within this window are queued so the client can keep
     *  studying them in time order rather than idling on a countdown. */
    private static final int LEARN_AHEAD_MINUTES = 20;

    DeckRepository deckRepository;
    DeckItemRepository deckItemRepository;
    FlashcardRepository flashcardRepository;
    AnkiSrsProgressRepository progressRepository;
    AnkiSrsSettingRepository settingRepository;
    UserRepository userRepository;
    SchedulerFactory schedulerFactory;
    ObjectMapper objectMapper;

    /* ──────────────────────────────────────────
       GET /api/anki/study/{deckId}
       Returns the study queue for a deck.
       Includes NEW cards + DUE cards. Queue selection is algorithm-agnostic
       (based on next_review_at + daily limits); only the per-button preview
       labels are produced by the deck's scheduler.
    ────────────────────────────────────────── */
    @GetMapping("/{deckId}")
    @PreAuthorize("hasAuthority('ANKI_SRS_PROGRESS_READ')")
    @Transactional(readOnly = true)
    public ResponseEntity<AnkiStudyQueueDTO> getStudyQueue(
            @PathVariable Long deckId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal.getId();

        Deck deck = deckRepository.findById(deckId).orElseThrow();

        List<DeckItem> items = deckItemRepository.findByDeckIdOrderByOrderIndexAsc(deckId);
        if (items.isEmpty()) {
            return ResponseEntity.ok(AnkiStudyQueueDTO.builder()
                    .deckTitle(deck.getTitle())
                    .cards(List.of())
                    .totalNew(0)
                    .totalLearning(0)
                    .totalReview(0)
                    .dueReviewCards(0)
                    .totalDue(0)
                    .build());
        }

        List<Long> flashcardIds = items.stream().map(i -> i.getFlashcard().getId()).toList();
        List<Flashcard> flashcards = flashcardRepository.findAllById(flashcardIds);
        Map<Long, Flashcard> fcMap = flashcards.stream().collect(Collectors.toMap(Flashcard::getId, f -> f));

        List<AnkiSrsProgress> progressList = progressRepository.findByUserIdAndDeckId(userId, deckId);
        Map<Long, AnkiSrsProgress> progressMap = progressList.stream()
                .collect(Collectors.toMap(p -> p.getFlashcard().getId(), p -> p));

        AnkiSrsSetting setting = settingRepository.findByUserIdAndDeckId(userId, deckId).orElse(null);
        SchedulingConfig schedulingConfig = SchedulingConfig.from(setting, objectMapper);
        SrsScheduler scheduler = schedulerFactory.resolve(schedulingConfig.algorithmType);
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        long learnedToday = progressList.stream()
                .filter(p -> p.getFirstLearnedAt() != null)
                .filter(p -> today.equals(p.getFirstLearnedAt().toLocalDate()))
                .count();
        long reviewedToday = progressList.stream()
                .filter(p -> p.getLastReviewedAt() != null)
                .filter(p -> today.equals(p.getLastReviewedAt().toLocalDate()))
                .filter(p -> p.getFirstLearnedAt() == null || !today.equals(p.getFirstLearnedAt().toLocalDate()))
                .count();
        int newLimit = setting != null && setting.getMaxItemsPerDay() != null
                ? Math.max(0, setting.getMaxItemsPerDay() - (int) learnedToday) : Integer.MAX_VALUE;
        int dueLimit = setting != null && setting.getMaxReviewsPerDay() != null
                ? Math.max(0, setting.getMaxReviewsPerDay() - (int) reviewedToday) : Integer.MAX_VALUE;
        int queuedNew = 0;
        int queuedDue = 0;

        List<AnkiStudyCardDTO> studyCards = new ArrayList<>();
        int totalNew = 0;
        int totalLearning = 0;
        int totalReview = 0;
        int dueReviewCards = 0;
        int totalDue = 0;

        for (DeckItem item : items) {
            Flashcard fc = fcMap.get(item.getFlashcard().getId());
            if (fc == null) continue;

            AnkiSrsProgress progress = progressMap.get(fc.getId());

            boolean isNew = progress == null || "NEW".equals(progress.getState());
            boolean isDue = !isNew && isDue(progress, now);

            if (isNew) {
                totalNew++;
                if (queuedNew >= newLimit) continue;
                queuedNew++;
            } else {
                if ("LEARNING".equals(progress.getState()) || "RELEARNING".equals(progress.getState())) {
                    totalLearning++;
                    // Learn-ahead: include learning/relearning cards due now OR
                    // coming up within the window, so the client can keep
                    // studying them in time order without idling (matches Anki).
                    boolean dueSoon = progress.getNextReviewAt() == null
                            || !progress.getNextReviewAt().isAfter(now.plusMinutes(LEARN_AHEAD_MINUTES));
                    if (!dueSoon) continue;
                } else if ("REVIEW".equals(progress.getState())) {
                    totalReview++;
                    if (!isDue) continue;
                    totalDue++;
                    dueReviewCards++;
                    if (queuedDue >= dueLimit) continue;
                    queuedDue++;
                } else {
                    if (!isDue) continue;
                }
            }

            studyCards.add(buildCardDTO(fc, progress, schedulingConfig, scheduler));
        }

        return ResponseEntity.ok(AnkiStudyQueueDTO.builder()
                .deckTitle(deck.getTitle())
                .cards(studyCards)
                .totalNew(totalNew)
                .totalLearning(totalLearning)
                .totalReview(totalReview)
                .dueReviewCards(dueReviewCards)
                .totalDue(totalDue)
                .build());
    }

    /* ──────────────────────────────────────────
       POST /api/anki/study/review
       Resolves the deck's scheduler (SM-2 today; FSRS = future) and applies it.
    ────────────────────────────────────────── */
    @PostMapping("/review")
    @PreAuthorize("hasAuthority('ANKI_SRS_PROGRESS_CREATE')")
    @Transactional
    public ResponseEntity<AnkiStudyCardDTO> review(
            @Valid @RequestBody AnkiReviewRequest req,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal.getId();

        Flashcard flashcard = flashcardRepository.findById(req.getFlashcardId()).orElseThrow();
        Deck deck = deckRepository.findById(req.getDeckId()).orElseThrow();
        AnkiSrsSetting setting = settingRepository.findByUserIdAndDeckId(userId, req.getDeckId()).orElse(null);
        SchedulingConfig schedulingConfig = SchedulingConfig.from(setting, objectMapper);
        SrsScheduler scheduler = schedulerFactory.resolve(schedulingConfig.algorithmType);

        AnkiSrsProgress progress = progressRepository
                .findByUserIdAndDeckIdAndFlashcardId(userId, req.getDeckId(), req.getFlashcardId())
                .orElseGet(() -> {
                    User user = userRepository.findById(userId).orElseThrow();
                    AnkiSrsProgress p = new AnkiSrsProgress();
                    p.setUser(user);
                    p.setDeck(deck);
                    p.setFlashcard(flashcard);
                    p.setState("NEW");
                    p.setEaseFactor(schedulingConfig.startingEase);
                    p.setIntervalDays(0);
                    p.setReviewCount(0);
                    p.setLapses(0);
                    p.setLearningStepIndex(0);
                    p.setMemoryScore(0.0);
                    return p;
                });

        try {
            scheduler.review(progress, Rating.fromString(req.getRating()), schedulingConfig, LocalDateTime.now());
        } catch (UnsupportedOperationException notImplemented) {
            // A not-yet-implemented scheduler (e.g. FSRS) was selected. We do NOT
            // fabricate a result — report 501 so the client keeps the deck on SM-2.
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
        }

        progress = progressRepository.save(progress);
        return ResponseEntity.ok(buildCardDTO(flashcard, progress, schedulingConfig, scheduler));
    }

    /* ── Helpers ── */

    /** Queue-level due check (algorithm-agnostic). Learn-ahead is applied in the
     *  queue builder, not here. */
    private boolean isDue(AnkiSrsProgress p, LocalDateTime now) {
        if ("LEARNING".equals(p.getState()) || "RELEARNING".equals(p.getState())) {
            return p.getNextReviewAt() == null || !p.getNextReviewAt().isAfter(now);
        }
        return p.getNextReviewAt() != null && !p.getNextReviewAt().isAfter(now);
    }

    private AnkiStudyCardDTO buildCardDTO(Flashcard fc, AnkiSrsProgress p, SchedulingConfig config, SrsScheduler scheduler) {
        PreviewResult preview = scheduler.preview(p, config, LocalDateTime.now());
        return AnkiStudyCardDTO.builder()
                .flashcardId(fc.getId())
                .front(extractText(fc, SideType.FRONT))
                .back(extractText(fc, SideType.BACK))
                .frontImages(extractMediaListFromSide(fc, SideType.FRONT, ContentType.IMAGE))
                .frontAudios(extractMediaListFromSide(fc, SideType.FRONT, ContentType.AUDIO))
                .frontVideos(extractMediaListFromSide(fc, SideType.FRONT, ContentType.VIDEO))
                .backImages(extractMediaListFromSide(fc, SideType.BACK, ContentType.IMAGE))
                .backAudios(extractMediaListFromSide(fc, SideType.BACK, ContentType.AUDIO))
                .backVideos(extractMediaListFromSide(fc, SideType.BACK, ContentType.VIDEO))
                .progressId(p != null ? p.getId() : null)
                .state(p != null ? p.getState() : "NEW")
                .easeFactor(p != null ? p.getEaseFactor() : config.startingEase)
                .intervalDays(p != null ? p.getIntervalDays() : 0)
                .reviewCount(p != null ? p.getReviewCount() : 0)
                .lapses(p != null ? p.getLapses() : 0)
                .nextReviewAt(p != null ? p.getNextReviewAt() : null)
                .againPreview(preview.getAgain())
                .hardPreview(preview.getHard())
                .goodPreview(preview.getGood())
                .easyPreview(preview.getEasy())
                .build();
    }

    private List<String> extractMediaListFromSide(Flashcard fc, SideType sideType, ContentType type) {
        if (fc.getSides() == null) return List.of();
        for (FlashcardSide side : fc.getSides()) {
            if (side.getSide() != sideType || side.getContents() == null) continue;
            return side.getContents().stream()
                    .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
                    .filter(c -> c.getContentType() == type)
                    .filter(c -> c.getContentValue() != null && !c.getContentValue().isBlank())
                    .sorted(java.util.Comparator.comparingInt(FlashcardSideContent::getOrderIndex))
                    .map(FlashcardSideContent::getContentValue)
                    .toList();
        }
        return List.of();
    }

    /* ── All non-deleted TEXT/CLOZE blocks from a side, joined with newline ── */
    private String extractText(Flashcard fc, SideType sideType) {
        if (fc.getSides() == null) return null;
        for (FlashcardSide side : fc.getSides()) {
            if (side.getSide() != sideType || side.getContents() == null) continue;
            String joined = side.getContents().stream()
                    .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
                    .filter(c -> c.getContentType() == ContentType.TEXT
                              || c.getContentType() == ContentType.CLOZE)
                    .sorted(java.util.Comparator.comparingInt(FlashcardSideContent::getOrderIndex))
                    .map(FlashcardSideContent::getContentValue)
                    .filter(v -> v != null && !v.isBlank())
                    .collect(java.util.stream.Collectors.joining("\n"));
            return joined.isBlank() ? null : joined;
        }
        return null;
    }

    /* ──────────────────────────────────────────
       GET /api/anki/study/{deckId}/stats
       Anki-style statistics aggregated from SRS progress rows.
    ────────────────────────────────────────── */
    @GetMapping("/{deckId}/stats")
    @PreAuthorize("hasAuthority('ANKI_SRS_PROGRESS_READ')")
    @Transactional(readOnly = true)
    public ResponseEntity<AnkiStatsDTO> stats(
            @PathVariable Long deckId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal.getId();
        Deck deck = deckRepository.findById(deckId).orElseThrow();

        List<DeckItem> items = deckItemRepository.findByDeckIdOrderByOrderIndexAsc(deckId);
        List<AnkiSrsProgress> rows = progressRepository.findByUserIdAndDeckId(userId, deckId);
        Map<Long, AnkiSrsProgress> progressMap = rows.stream()
                .collect(Collectors.toMap(p -> p.getFlashcard().getId(), p -> p));

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();

        int newC = 0, learning = 0, relearning = 0, review = 0;
        int studiedToday = 0, dueToday = 0, dueTomorrow = 0, dueReviewCards = 0;
        double sumMemory = 0, sumEase = 0, sumInterval = 0;
        int totalReviews = 0, totalLapses = 0, hasEaseCount = 0;

        int[] futureDue = new int[31];
        List<Integer> intervals = new ArrayList<>();
        List<Double> easeFactors = new ArrayList<>();

        for (DeckItem item : items) {
            AnkiSrsProgress p = progressMap.get(item.getFlashcard().getId());
            if (p == null || "NEW".equals(p.getState())) {
                newC++;
                continue;
            }

            switch (p.getState()) {
                case "LEARNING"   -> learning++;
                case "RELEARNING" -> relearning++;
                case "REVIEW"     -> review++;
            }

            if (p.getLastReviewedAt() != null && today.equals(p.getLastReviewedAt().toLocalDate())) {
                studiedToday++;
            }

            if ("REVIEW".equals(p.getState()) && p.getNextReviewAt() != null) {
                LocalDateTime nextReviewAt = p.getNextReviewAt();
                LocalDate due = nextReviewAt.toLocalDate();
                long diff = ChronoUnit.DAYS.between(today, due);
                if (!nextReviewAt.isAfter(now)) {
                    // Overdue (from any past day or already past today) →
                    // count in dueToday AND show in the T-bar of Future Due chart.
                    dueToday++;
                    dueReviewCards++;
                    futureDue[0]++;
                } else {
                    // Due in the future
                    if (diff == 1) dueTomorrow++;
                    if (diff >= 0 && diff <= 30) futureDue[(int) diff]++;
                }
            }

            sumMemory    += p.getMemoryScore();
            totalReviews += p.getReviewCount();
            totalLapses  += p.getLapses();

            if (!"NEW".equals(p.getState())) {
                sumEase += p.getEaseFactor();
                sumInterval += p.getIntervalDays();
                intervals.add(p.getIntervalDays());
                easeFactors.add(p.getEaseFactor());
                hasEaseCount++;
            }
        }

        int    total       = items.size();
        double avgMem      = rows.size() > 0 ? Math.round(sumMemory   / rows.size() * 10.0) / 10.0 : 0;
        double avgEase     = hasEaseCount > 0 ? Math.round(sumEase    / hasEaseCount * 100.0) / 100.0 : 2.5;
        double avgInterval = hasEaseCount > 0 ? Math.round(sumInterval / hasEaseCount * 10.0) / 10.0 : 0;

        List<AnkiStatsDTO.DayCount> futureDueList = new ArrayList<>();
        for (int d = 0; d <= 30; d++) {
            futureDueList.add(new AnkiStatsDTO.DayCount(d, futureDue[d]));
        }

        return ResponseEntity.ok(AnkiStatsDTO.builder()
                .deckId(deck.getId())
                .deckTitle(deck.getTitle())
                .totalCards(total)
                .newCards(newC)
                .learningCards(learning)
                .relearningCards(relearning)
                .reviewCards(review)
                .studiedToday(studiedToday)
                .dueToday(dueToday)
                .dueTomorrow(dueTomorrow)
                .dueReviewCards(dueReviewCards)
                .avgMemoryScore(avgMem)
                .avgEaseFactor(avgEase)
                .avgIntervalDays(avgInterval)
                .totalReviews(totalReviews)
                .totalLapses(totalLapses)
                .futureReviews(futureDueList)
                .intervalBuckets(buildIntervalBuckets(intervals))
                .easeBuckets(buildEaseBuckets(easeFactors))
                .build());
    }

    private List<AnkiStatsDTO.BucketCount> buildIntervalBuckets(List<Integer> intervals) {
        int[][] ranges = {{1,1},{2,3},{4,7},{8,14},{15,30},{31,90},{91,180},{181,365},{366,Integer.MAX_VALUE}};
        String[] labels = {"1d","2-3d","4-7d","8-14d","15-30d","1-3mo","3-6mo","6-12mo","1yr+"};
        int[] counts = new int[labels.length];
        for (int v : intervals) {
            for (int i = 0; i < ranges.length; i++) {
                if (v >= ranges[i][0] && v <= ranges[i][1]) { counts[i]++; break; }
            }
        }
        List<AnkiStatsDTO.BucketCount> r = new ArrayList<>();
        for (int i = 0; i < labels.length; i++) r.add(new AnkiStatsDTO.BucketCount(labels[i], counts[i]));
        return r;
    }

    private List<AnkiStatsDTO.BucketCount> buildEaseBuckets(List<Double> eases) {
        double[] upper = {1.60, 1.90, 2.20, 2.50, 2.80, 3.10, Double.MAX_VALUE};
        String[] labels = {"130-160%","161-190%","191-220%","221-250%","251-280%","281-310%","310%+"};
        int[] counts = new int[labels.length];
        for (double v : eases) {
            for (int i = 0; i < upper.length; i++) {
                if (v <= upper[i]) { counts[i]++; break; }
            }
        }
        List<AnkiStatsDTO.BucketCount> r = new ArrayList<>();
        for (int i = 0; i < labels.length; i++) r.add(new AnkiStatsDTO.BucketCount(labels[i], counts[i]));
        return r;
    }

}
