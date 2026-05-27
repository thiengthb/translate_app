package com.example.starter_project_2025.domain.library.srs.study;

import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.deck_item.DeckItemRepository;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
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

import java.time.LocalDateTime;
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

    DeckRepository deckRepository;
    DeckItemRepository deckItemRepository;
    FlashcardRepository flashcardRepository;
    AnkiSrsProgressRepository progressRepository;
    UserRepository userRepository;

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
                    .totalDue(0)
                    .build());
        }

        List<Long> flashcardIds = items.stream().map(i -> i.getFlashcard().getId()).toList();
        List<Flashcard> flashcards = flashcardRepository.findAllById(flashcardIds);
        Map<Long, Flashcard> fcMap = flashcards.stream().collect(Collectors.toMap(Flashcard::getId, f -> f));

        List<AnkiSrsProgress> progressList = progressRepository.findByUserIdAndDeckId(userId, deckId);
        Map<Long, AnkiSrsProgress> progressMap = progressList.stream()
                .collect(Collectors.toMap(p -> p.getFlashcard().getId(), p -> p));

        LocalDateTime now = LocalDateTime.now();
        List<AnkiStudyCardDTO> studyCards = new ArrayList<>();
        int totalNew = 0;
        int totalDue = 0;

        for (DeckItem item : items) {
            Flashcard fc = fcMap.get(item.getFlashcard().getId());
            if (fc == null) continue;

            AnkiSrsProgress progress = progressMap.get(fc.getId());

            boolean isNew = (progress == null);
            boolean isDue = !isNew && isDue(progress, now);

            if (!isNew && !isDue) continue;

            if (isNew) totalNew++;
            else totalDue++;

            studyCards.add(buildCardDTO(fc, progress));
        }

        return ResponseEntity.ok(AnkiStudyQueueDTO.builder()
                .deckTitle(deck.getTitle())
                .cards(studyCards)
                .totalNew(totalNew)
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

        AnkiSrsProgress progress = progressRepository
                .findByUserIdAndDeckIdAndFlashcardId(userId, req.getDeckId(), req.getFlashcardId())
                .orElseGet(() -> {
                    User user = userRepository.findById(userId).orElseThrow();
                    AnkiSrsProgress p = new AnkiSrsProgress();
                    p.setUser(user);
                    p.setDeck(deck);
                    p.setFlashcard(flashcard);
                    p.setState("NEW");
                    p.setEaseFactor(2.5);
                    p.setIntervalDays(0);
                    p.setReviewCount(0);
                    p.setLapses(0);
                    p.setMemoryScore(0.0);
                    return p;
                });

        applySmTwo(progress, req.getRating());

        progress = progressRepository.save(progress);
        return ResponseEntity.ok(buildCardDTO(flashcard, progress));
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
    private boolean isDue(AnkiSrsProgress p, LocalDateTime now) {
        if ("LEARNING".equals(p.getState()) || "RELEARNING".equals(p.getState())) return true;
        return p.getNextReviewAt() != null && !p.getNextReviewAt().isAfter(now);
    }

    private AnkiStudyCardDTO buildCardDTO(Flashcard fc, AnkiSrsProgress p) {
        return AnkiStudyCardDTO.builder()
                .flashcardId(fc.getId())
                .front(fc.getFront())
                .back(fc.getBack())
                .imageUrl(fc.getImageUrl())
                .progressId(p != null ? p.getId() : null)
                .state(p != null ? p.getState() : "NEW")
                .easeFactor(p != null ? p.getEaseFactor() : 2.5)
                .intervalDays(p != null ? p.getIntervalDays() : 0)
                .reviewCount(p != null ? p.getReviewCount() : 0)
                .lapses(p != null ? p.getLapses() : 0)
                .nextReviewAt(p != null ? p.getNextReviewAt() : null)
                .build();
    }
}
