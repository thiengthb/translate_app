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
    int dueToday;      // already-past or today
    int dueTomorrow;

    /* ── Aggregates ── */
    double avgMemoryScore;
    double avgEaseFactor;
    double avgIntervalDays;
    int    totalReviews;   // sum of reviewCount across all cards
    int    totalLapses;

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
