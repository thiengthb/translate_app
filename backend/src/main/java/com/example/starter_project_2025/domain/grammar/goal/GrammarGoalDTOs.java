package com.example.starter_project_2025.domain.grammar.goal;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

public final class GrammarGoalDTOs {

    private GrammarGoalDTOs() {}

    /** The user's daily goal plus how much of it is already done today. */
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class GoalSnapshot {
        Integer newPerDay;
        Integer reviewsPerDay;
        int newDoneToday;
        int reviewsDoneToday;
        int newRemaining;
        int reviewsRemaining;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class GoalUpdateRequest {
        @NotNull @Min(0) @Max(200)
        Integer newPerDay;
        @NotNull @Min(0) @Max(1000)
        Integer reviewsPerDay;
    }
}
