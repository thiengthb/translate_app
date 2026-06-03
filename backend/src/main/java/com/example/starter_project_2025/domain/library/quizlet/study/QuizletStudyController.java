package com.example.starter_project_2025.domain.library.quizlet.study;

import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.deck_item.DeckItemRepository;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
import com.example.starter_project_2025.domain.library.quizlet.card_progress.QuizletCardProgress;
import com.example.starter_project_2025.domain.library.quizlet.card_progress.QuizletCardProgressRepository;
import com.example.starter_project_2025.domain.library.quizlet.study_log.QuizletStudyLog;
import com.example.starter_project_2025.domain.library.quizlet.study_log.QuizletStudyLogRepository;
import com.example.starter_project_2025.domain.library.quizlet.study_session.QuizletStudySession;
import com.example.starter_project_2025.domain.library.quizlet.study_session.QuizletStudySessionRepository;
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
import java.util.List;

/**
 * Study APIs for the non-SRS learning modes (Flashcard / Learn / Match / Write / Quiz).
 *
 * <p>CRITICAL SEPARATION RULE: nothing in this controller reads or writes
 * {@code AnkiSrsProgress} or any SRS scheduling field. Practising a deck in
 * these modes must never change a card's due date, interval, ease factor or
 * state. All persistence lands in the Quizlet-side tables only:
 * {@code quizlet_card_progress}, {@code quizlet_study_logs},
 * {@code quizlet_study_sessions}.
 */
@RestController
@RequestMapping("/api/quizlet/study")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "QuizletStudy", description = "Non-SRS study session APIs (Flashcard/Learn/Match/Write/Quiz)")
public class QuizletStudyController {

    DeckRepository deckRepository;
    DeckItemRepository deckItemRepository;
    FlashcardRepository flashcardRepository;
    QuizletCardProgressRepository progressRepository;
    QuizletStudyLogRepository studyLogRepository;
    QuizletStudySessionRepository studySessionRepository;
    UserRepository userRepository;

    /** Cards considered "mastered" once correctly answered this many times. */
    private static final int MASTERY_THRESHOLD = 2;

    /* ──────────────────────────────────────────
       GET /api/quizlet/study/{deckId}/progress
       Per-card progress for the current user. Read-only.
    ────────────────────────────────────────── */
    @GetMapping("/{deckId}/progress")
    @PreAuthorize("hasAuthority('QUIZLET_CARD_PROGRESS_READ')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<QuizletProgressDTO>> getProgress(
            @PathVariable Long deckId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal.getId();
        List<QuizletProgressDTO> result = progressRepository.findByUserIdAndDeckId(userId, deckId)
                .stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(result);
    }

    /* ──────────────────────────────────────────
       POST /api/quizlet/study/answer
       Upserts per-card progress + appends a study log. NEVER touches SRS.
    ────────────────────────────────────────── */
    @PostMapping("/answer")
    @PreAuthorize("hasAuthority('QUIZLET_CARD_PROGRESS_CREATE')")
    @Transactional
    public ResponseEntity<QuizletProgressDTO> answer(
            @Valid @RequestBody QuizletAnswerRequest req,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal.getId();

        Deck deck = deckRepository.findById(req.getDeckId()).orElseThrow();
        Flashcard flashcard = flashcardRepository.findById(req.getFlashcardId()).orElseThrow();
        DeckItem deckItem = deckItemRepository
                .findByDeckIdAndFlashcardId(req.getDeckId(), req.getFlashcardId())
                .orElseThrow();
        boolean correct = Boolean.TRUE.equals(req.getCorrect());
        LocalDateTime now = LocalDateTime.now();

        QuizletCardProgress progress = progressRepository
                .findByUserIdAndDeckItemId(userId, deckItem.getId())
                .orElseGet(() -> {
                    User user = userRepository.findById(userId).orElseThrow();
                    QuizletCardProgress p = new QuizletCardProgress();
                    p.setUser(user);
                    p.setDeck(deck);
                    p.setDeckItem(deckItem);
                    p.setFlashcard(flashcard);
                    p.setWordId(flashcard.getWordId());
                    p.setStatus("NOT_STUDIED");
                    p.setCorrectCount(0);
                    p.setWrongCount(0);
                    return p;
                });

        if (correct) {
            progress.setCorrectCount(progress.getCorrectCount() + 1);
        } else {
            progress.setWrongCount(progress.getWrongCount() + 1);
        }
        progress.setLastAnswerCorrect(correct);
        progress.setLastStudiedAt(now);
        progress.setStatus(resolveStatus(progress.getCorrectCount(), correct));
        progress = progressRepository.save(progress);

        User user = progress.getUser();
        QuizletStudyLog log = new QuizletStudyLog();
        log.setUser(user);
        log.setDeck(deck);
        log.setDeckItem(deckItem);
        log.setFlashcard(flashcard);
        log.setWordId(flashcard.getWordId());
        log.setResult(correct ? "CORRECT" : "WRONG");
        log.setStudiedAt(now);
        studyLogRepository.save(log);

        return ResponseEntity.ok(toDTO(progress));
    }

    /* ──────────────────────────────────────────
       POST /api/quizlet/study/session
       Records a finished session (study time + cards viewed). NEVER touches SRS.
    ────────────────────────────────────────── */
    @PostMapping("/session")
    @PreAuthorize("hasAuthority('QUIZLET_STUDY_SESSION_CREATE')")
    @Transactional
    public ResponseEntity<Void> logSession(
            @Valid @RequestBody QuizletSessionRequest req,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal.getId();
        User user = userRepository.findById(userId).orElseThrow();
        Deck deck = deckRepository.findById(req.getDeckId()).orElseThrow();

        LocalDateTime now = LocalDateTime.now();
        QuizletStudySession session = new QuizletStudySession();
        session.setUser(user);
        session.setDeck(deck);
        session.setMode(req.getMode());
        session.setStartedAt(req.getStartedAt() != null ? req.getStartedAt() : now);
        session.setEndedAt(req.getEndedAt() != null ? req.getEndedAt() : now);
        session.setTotalItems(req.getTotalItems());
        session.setCompletedItems(req.getCompletedItems());
        studySessionRepository.save(session);

        return ResponseEntity.ok().build();
    }

    /* ── helpers ── */
    private String resolveStatus(int correctCount, boolean lastCorrect) {
        if (lastCorrect && correctCount >= MASTERY_THRESHOLD) return "MASTERED";
        return "STUDYING";
    }

    private QuizletProgressDTO toDTO(QuizletCardProgress p) {
        return QuizletProgressDTO.builder()
                .id(p.getId())
                .flashcardId(p.getFlashcard() != null ? p.getFlashcard().getId() : null)
                .deckItemId(p.getDeckItem() != null ? p.getDeckItem().getId() : null)
                .status(p.getStatus())
                .correctCount(p.getCorrectCount())
                .wrongCount(p.getWrongCount())
                .lastAnswerCorrect(p.getLastAnswerCorrect())
                .lastStudiedAt(p.getLastStudiedAt())
                .build();
    }
}
