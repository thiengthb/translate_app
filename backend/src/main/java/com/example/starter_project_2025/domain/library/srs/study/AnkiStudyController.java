package com.example.starter_project_2025.domain.library.srs.study;

import com.fasterxml.jackson.databind.JsonNode;
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
import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
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
@Tag(name = "AnkiStudy", description = "Anki SM2 study session APIs")
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
    ObjectMapper objectMapper;

    /* ──────────────────────────────────────────
       GET /api/anki/study/{deckId}
       Returns the study queue for a deck.
       Includes NEW cards + DUE cards.
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

            studyCards.add(buildCardDTO(fc, progress, schedulingConfig));
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
       Applies SM2 and updates progress.
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

        applyAnkiSm2(progress, req.getRating(), schedulingConfig);

        progress = progressRepository.save(progress);
        return ResponseEntity.ok(buildCardDTO(flashcard, progress, schedulingConfig));
    }

    /* ── SM2 algorithm ── */
    private void applySmTwo(AnkiSrsProgress p, String rating) {
        int quality = switch (rating.toUpperCase()) {
            case "AGAIN" -> 1;
            case "HARD"  -> 3;
            case "EASY"  -> 5;
            default      -> 4; // GOOD
        };

        LocalDateTime now = LocalDateTime.now();

        if (p.getFirstLearnedAt() == null) {
            p.setFirstLearnedAt(now);
        }

        String previousState = p.getState();

        if (quality < 3) {
            // Failed — reset repetition count and bump lapses
            if ("REVIEW".equals(previousState)) {
                p.setLapses(p.getLapses() + 1);
            }
            p.setReviewCount(0);
            p.setIntervalDays(1);
            p.setState("RELEARNING".equals(previousState) || "REVIEW".equals(previousState)
                    ? "RELEARNING" : "LEARNING");
            // Re-queue in ~1 minute so it reappears in the session
            p.setNextReviewAt(now.plusMinutes(1));
        } else {
            int rep = p.getReviewCount();
            int newInterval;
            if (rep == 0) {
                newInterval = 1;
            } else if (rep == 1) {
                newInterval = 6;
            } else {
                newInterval = (int) Math.round(p.getIntervalDays() * p.getEaseFactor());
            }

            // Easy bonus
            if (quality == 5) {
                newInterval = (int) Math.round(newInterval * 1.3);
            }
            newInterval = Math.max(1, newInterval);

            double ef = p.getEaseFactor()
                    + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            if (ef < 1.3) ef = 1.3;

            p.setIntervalDays(newInterval);
            p.setEaseFactor(ef);
            p.setReviewCount(rep + 1);
            p.setState(newInterval <= 2 ? "LEARNING" : "REVIEW");
            p.setNextReviewAt(now.plusDays(newInterval));
        }

        p.setLastRating(rating.toUpperCase());
        p.setLastReviewedAt(now);

        // Simple memory score: 0–100 based on ease factor relative to range [1.3, 3.5]
        double memScore = Math.min(100.0, Math.max(0.0,
                (p.getEaseFactor() - 1.3) / (3.5 - 1.3) * 100));
        p.setMemoryScore(memScore);
    }

    /* ── Helpers ── */
    private void applyAnkiSm2(AnkiSrsProgress progress, String rating, SchedulingConfig config) {
        applyAnkiSm2(progress, rating, config, LocalDateTime.now());
    }

    private void applyAnkiSm2(
            AnkiSrsProgress progress,
            String rating,
            SchedulingConfig config,
            LocalDateTime now
    ) {
        String normalizedRating = normalizeRating(rating);
        String state = progress.getState() != null ? progress.getState() : "NEW";

        if (progress.getFirstLearnedAt() == null) {
            progress.setFirstLearnedAt(now);
        }

        progress.setReviewCount(nvl(progress.getReviewCount()) + 1);

        if ("REVIEW".equals(state)) {
            applyReviewAnswer(progress, normalizedRating, config, now);
        } else if ("RELEARNING".equals(state)) {
            applyLearningAnswer(progress, normalizedRating, config, now, true);
        } else {
            applyLearningAnswer(progress, normalizedRating, config, now, false);
        }

        progress.setLastRating(normalizedRating);
        progress.setLastReviewedAt(now);
        progress.setMemoryScore(memoryScore(progress.getEaseFactor(), config));
    }

    private void applyLearningAnswer(
            AnkiSrsProgress progress,
            String rating,
            SchedulingConfig config,
            LocalDateTime now,
            boolean relearning
    ) {
        List<Duration> steps = relearning ? config.relearningSteps : config.learningSteps;

        if (steps.isEmpty()) {
            graduate(progress, relearning ? progress.getIntervalDays() : config.graduatingIntervalDays, config, now);
            return;
        }

        int currentStep = clamp(nvl(progress.getLearningStepIndex()), 0, steps.size() - 1);

        switch (rating) {
            case "AGAIN" -> {
                progress.setState(relearning ? "RELEARNING" : "LEARNING");
                progress.setLearningStepIndex(0);
                progress.setNextReviewAt(now.plus(steps.get(0)));
            }
            case "HARD" -> {
                Duration againDelay = steps.get(currentStep);
                Duration goodDelay = currentStep + 1 < steps.size()
                        ? steps.get(currentStep + 1)
                        : Duration.ofDays(Math.max(1, relearning
                                ? nvl(progress.getIntervalDays(), 1)
                                : config.graduatingIntervalDays));
                Duration hardDelay = average(againDelay, goodDelay);
                progress.setState(relearning ? "RELEARNING" : "LEARNING");
                progress.setLearningStepIndex(currentStep);
                progress.setNextReviewAt(now.plus(hardDelay));
            }
            case "EASY" -> graduate(progress, relearning
                    ? Math.max(nvl(progress.getIntervalDays(), 1), config.graduatingIntervalDays)
                    : config.easyIntervalDays, config, now);
            default -> {
                if (currentStep + 1 >= steps.size()) {
                    graduate(progress, relearning ? progress.getIntervalDays() : config.graduatingIntervalDays, config, now);
                } else {
                    int nextStep = currentStep + 1;
                    progress.setState(relearning ? "RELEARNING" : "LEARNING");
                    progress.setLearningStepIndex(nextStep);
                    progress.setNextReviewAt(now.plus(steps.get(nextStep)));
                }
            }
        }
    }

    private void applyReviewAnswer(
            AnkiSrsProgress progress,
            String rating,
            SchedulingConfig config,
            LocalDateTime now
    ) {
        int currentInterval = Math.max(1, nvl(progress.getIntervalDays(), 1));
        int daysLate = progress.getNextReviewAt() != null && progress.getNextReviewAt().isBefore(now)
                ? (int) Math.max(0, ChronoUnit.DAYS.between(progress.getNextReviewAt(), now))
                : 0;
        double ease = Math.max(config.minEase, nvl(progress.getEaseFactor(), config.startingEase));
        double intervalModifier = config.intervalModifier * retentionModifier(config.targetRetention);

        switch (rating) {
            case "AGAIN" -> {
                progress.setEaseFactor(Math.max(config.minEase, ease - 0.20));
                progress.setLapses(nvl(progress.getLapses()) + 1);
                progress.setLearningStepIndex(0);

                int relearnInterval = config.newInterval <= 0
                        ? 1
                        : clampInterval((int) Math.round(currentInterval * config.newInterval), 1, config.maxIntervalDays);
                progress.setIntervalDays(relearnInterval);

                if (config.relearningSteps.isEmpty()) {
                    progress.setState("REVIEW");
                    progress.setNextReviewAt(now.plusDays(relearnInterval));
                } else {
                    progress.setState("RELEARNING");
                    progress.setNextReviewAt(now.plus(config.relearningSteps.get(0)));
                }
            }
            case "HARD" -> {
                progress.setEaseFactor(Math.max(config.minEase, ease - 0.15));
                int nextInterval = nextReviewInterval(
                        currentInterval, daysLate, 0.25, config.hardInterval, intervalModifier, config
                );
                scheduleReview(progress, nextInterval, now);
            }
            case "EASY" -> {
                progress.setEaseFactor(ease + 0.15);
                int nextInterval = nextReviewInterval(
                        currentInterval, daysLate, 1.0, ease * config.easyBonus, intervalModifier, config
                );
                scheduleReview(progress, nextInterval, now);
            }
            default -> {
                progress.setEaseFactor(ease);
                int nextInterval = nextReviewInterval(
                        currentInterval, daysLate, 0.5, ease, intervalModifier, config
                );
                scheduleReview(progress, nextInterval, now);
            }
        }
    }

    private int nextReviewInterval(
            int currentInterval,
            int daysLate,
            double lateMultiplier,
            double answerMultiplier,
            double intervalModifier,
            SchedulingConfig config
    ) {
        double base = currentInterval + (daysLate * lateMultiplier);
        int computed = (int) Math.round(base * answerMultiplier * intervalModifier);
        return clampInterval(computed, currentInterval + 1, config.maxIntervalDays);
    }

    private void graduate(AnkiSrsProgress progress, Integer intervalDays, SchedulingConfig config, LocalDateTime now) {
        int interval = clampInterval(nvl(intervalDays, config.graduatingIntervalDays), 1, config.maxIntervalDays);
        progress.setState("REVIEW");
        progress.setLearningStepIndex(0);
        progress.setEaseFactor(Math.max(config.minEase, nvl(progress.getEaseFactor(), config.startingEase)));
        progress.setIntervalDays(interval);
        progress.setNextReviewAt(now.plusDays(interval));
    }

    private void scheduleReview(AnkiSrsProgress progress, int intervalDays, LocalDateTime now) {
        progress.setState("REVIEW");
        progress.setLearningStepIndex(0);
        progress.setIntervalDays(intervalDays);
        progress.setNextReviewAt(now.plusDays(intervalDays));
    }

    private boolean isDue(AnkiSrsProgress p, LocalDateTime now) {
        if ("LEARNING".equals(p.getState()) || "RELEARNING".equals(p.getState())) {
            return p.getNextReviewAt() == null || !p.getNextReviewAt().isAfter(now);
        }
        return p.getNextReviewAt() != null && !p.getNextReviewAt().isAfter(now);
    }

    private AnkiStudyCardDTO buildCardDTO(Flashcard fc, AnkiSrsProgress p, SchedulingConfig config) {
        AnkiSrsProgress previewSource = previewSource(p, config);
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
                .againPreview(previewLabel(previewSource, "AGAIN", config))
                .hardPreview(previewLabel(previewSource, "HARD", config))
                .goodPreview(previewLabel(previewSource, "GOOD", config))
                .easyPreview(previewLabel(previewSource, "EASY", config))
                .build();
    }

    /* ── All non-deleted contents of the given type on a specific side, ordered ── */
    private AnkiSrsProgress previewSource(AnkiSrsProgress p, SchedulingConfig config) {
        AnkiSrsProgress copy = new AnkiSrsProgress();
        copy.setState(p != null ? p.getState() : "NEW");
        copy.setEaseFactor(p != null ? p.getEaseFactor() : config.startingEase);
        copy.setIntervalDays(p != null ? p.getIntervalDays() : 0);
        copy.setReviewCount(p != null ? p.getReviewCount() : 0);
        copy.setLapses(p != null ? p.getLapses() : 0);
        copy.setLearningStepIndex(p != null ? p.getLearningStepIndex() : 0);
        copy.setNextReviewAt(p != null ? p.getNextReviewAt() : null);
        copy.setFirstLearnedAt(p != null ? p.getFirstLearnedAt() : null);
        return copy;
    }

    private String previewLabel(AnkiSrsProgress source, String rating, SchedulingConfig config) {
        AnkiSrsProgress copy = previewSource(source, config);
        LocalDateTime now = LocalDateTime.now();
        applyAnkiSm2(copy, rating, config, now);
        LocalDateTime next = copy.getNextReviewAt();
        if (next == null) return "-";

        long minutes = Math.max(0, ChronoUnit.MINUTES.between(now, next));
        if (minutes < 1) return "< 1m";
        if (minutes < 60) return minutes + "m";

        long hours = Math.max(1, ChronoUnit.HOURS.between(now, next));
        if (hours < 24) return hours + "h";

        long days = Math.max(1, ChronoUnit.DAYS.between(now.toLocalDate(), next.toLocalDate()));
        if (days < 30) return days + "d";

        long months = Math.max(1, Math.round(days / 30.0));
        if (months < 24) return months + "mo";

        return Math.round(days / 365.0) + "y";
    }

    private String normalizeRating(String rating) {
        if (rating == null) return "GOOD";
        return switch (rating.toUpperCase()) {
            case "AGAIN", "HARD", "GOOD", "EASY" -> rating.toUpperCase();
            default -> "GOOD";
        };
    }

    private int nvl(Integer value) {
        return value != null ? value : 0;
    }

    private int nvl(Integer value, int fallback) {
        return value != null ? value : fallback;
    }

    private double nvl(Double value, double fallback) {
        return value != null ? value : fallback;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private int clampInterval(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private Duration average(Duration a, Duration b) {
        return Duration.ofMillis((a.toMillis() + b.toMillis()) / 2);
    }

    private double retentionModifier(double targetRetention) {
        double retention = Math.max(0.70, Math.min(0.98, targetRetention));
        double modifier = Math.pow(0.90 / retention, 2);
        return Math.max(0.50, Math.min(1.50, modifier));
    }

    private double memoryScore(Double easeFactor, SchedulingConfig config) {
        double ease = nvl(easeFactor, config.startingEase);
        return Math.min(100.0, Math.max(0.0, (ease - config.minEase) / (3.5 - config.minEase) * 100));
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

    private static class SchedulingConfig {
        List<Duration> learningSteps = List.of(Duration.ofMinutes(1), Duration.ofMinutes(10));
        List<Duration> relearningSteps = List.of(Duration.ofMinutes(10));
        int graduatingIntervalDays = 1;
        int easyIntervalDays = 4;
        int maxIntervalDays = 36500;
        double startingEase = 2.5;
        double minEase = 1.3;
        double easyBonus = 1.3;
        double hardInterval = 1.2;
        double intervalModifier = 1.0;
        double newInterval = 0.0;
        double targetRetention = 0.9;

        static SchedulingConfig from(AnkiSrsSetting setting, ObjectMapper objectMapper) {
            SchedulingConfig config = new SchedulingConfig();
            if (setting != null && setting.getTargetRetention() != null) {
                config.targetRetention = setting.getTargetRetention();
            }

            String json = setting != null && setting.getAlgorithmConfig() != null
                    ? setting.getAlgorithmConfig().getConfigJson()
                    : null;
            if (json == null || json.isBlank()) {
                return config;
            }

            try {
                JsonNode root = objectMapper.readTree(json);
                config.learningSteps = readSteps(root, "learningSteps", config.learningSteps);
                config.relearningSteps = readSteps(root, "relearningSteps", config.relearningSteps);
                config.graduatingIntervalDays = readInt(root, "graduatingIntervalDays", config.graduatingIntervalDays, 1, 36500);
                config.easyIntervalDays = readInt(root, "easyIntervalDays", config.easyIntervalDays, 1, 36500);
                config.maxIntervalDays = readInt(root, "maxIntervalDays", config.maxIntervalDays, 1, 36500);
                config.startingEase = readDouble(root, "startingEase", config.startingEase, 1.3, 5.0);
                config.minEase = readDouble(root, "minEase", config.minEase, 1.3, 5.0);
                config.easyBonus = readDouble(root, "easyBonus", config.easyBonus, 1.0, 5.0);
                config.hardInterval = readDouble(root, "hardInterval", config.hardInterval, 1.0, 5.0);
                config.intervalModifier = readDouble(root, "intervalModifier", config.intervalModifier, 0.1, 5.0);
                config.newInterval = readDouble(root, "newInterval", config.newInterval, 0.0, 1.0);
            } catch (Exception ignored) {
                return config;
            }

            config.easyIntervalDays = Math.max(config.graduatingIntervalDays + 1, config.easyIntervalDays);
            config.maxIntervalDays = Math.max(config.easyIntervalDays, config.maxIntervalDays);
            return config;
        }

        private static List<Duration> readSteps(JsonNode root, String field, List<Duration> fallback) {
            JsonNode node = root.get(field);
            if (node == null || node.isNull()) return fallback;

            List<Duration> result = new ArrayList<>();
            if (node.isArray()) {
                node.forEach(item -> {
                    Duration parsed = parseStep(item.asText());
                    if (parsed != null) result.add(parsed);
                });
            } else {
                for (String token : node.asText("").split("\\s+")) {
                    Duration parsed = parseStep(token);
                    if (parsed != null) result.add(parsed);
                }
            }
            return result.isEmpty() ? fallback : result;
        }

        private static Duration parseStep(String raw) {
            if (raw == null || raw.isBlank()) return null;
            String token = raw.trim().toLowerCase();
            try {
                if (token.endsWith("m")) {
                    return Duration.ofMinutes(Long.parseLong(token.substring(0, token.length() - 1)));
                }
                if (token.endsWith("h")) {
                    return Duration.ofHours(Long.parseLong(token.substring(0, token.length() - 1)));
                }
                if (token.endsWith("d")) {
                    return Duration.ofDays(Long.parseLong(token.substring(0, token.length() - 1)));
                }
                return Duration.ofMinutes(Long.parseLong(token));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }

        private static int readInt(JsonNode root, String field, int fallback, int min, int max) {
            JsonNode node = root.get(field);
            if (node == null || !node.isNumber()) return fallback;
            int value = node.asInt(fallback);
            return Math.max(min, Math.min(max, value));
        }

        private static double readDouble(JsonNode root, String field, double fallback, double min, double max) {
            JsonNode node = root.get(field);
            if (node == null || !node.isNumber()) return fallback;
            double value = node.asDouble(fallback);
            return Math.max(min, Math.min(max, value));
        }
    }   // end SchedulingConfig

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
