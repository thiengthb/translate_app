package com.example.starter_project_2025.domain.library.srs.study;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Aggregated Anki SRS statistics for one deck, computed from AnkiSrsProgress rows.
 * Mirrors what Anki's Statistics window shows: card counts, future due, interval
 * distribution, ease distribution, and per-day today summary.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AnkiStatsDTO {

    /* ── Identity ── */
    Long   deckId;
    String deckTitle;

    /* ── Card state counts ── */
    int totalCards;
    int newCards;
    int learningCards;
    int relearningCards;
    int reviewCards;

    /* ── Today ── */
    int studiedToday;
    int dueToday;      // REVIEW cards due now; learning/relearning is not included
    int dueTomorrow;
    int dueReviewCards; // same meaning as dueToday; explicit for UI clarity

    /* ── Aggregates ── */
    double avgMemoryScore;
    double avgEaseFactor;
    double avgIntervalDays;
    int    totalReviews;   // sum of reviewCount across all cards
    int    totalLapses;

    /* ── Algorithm + FSRS aggregates ── */
    /** "SM2" or "FSRS" — lets the UI show ease (SM-2) or stability/difficulty (FSRS). */
    String algorithmType;
    double avgStability;   // FSRS: mean stability (days) over cards that have it
    double avgDifficulty;  // FSRS: mean difficulty (1–10) over cards that have it

    /* ── Leech / suspend ── */
    int leechCards;        // cards flagged as leeches
    int suspendedCards;    // cards currently suspended (hidden from study)

    /* ── Distributions ── */
    List<DayCount>    futureReviews;   // next 30 days, index 0 = today
    List<BucketCount> intervalBuckets;
    List<BucketCount> easeBuckets;

    /* ── Nested ── */
    @Getter @Setter @AllArgsConstructor @NoArgsConstructor
    public static class DayCount {
        int dayOffset; // 0 = today, 1 = tomorrow, etc.
        int count;
    }

    @Getter @Setter @AllArgsConstructor @NoArgsConstructor
    public static class BucketCount {
        String label;
        int    count;
    }
}
