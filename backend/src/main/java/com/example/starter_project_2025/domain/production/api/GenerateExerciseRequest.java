package com.example.starter_project_2025.domain.production.api;

import com.example.starter_project_2025.domain.production.vocab.VocabSource;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GenerateExerciseRequest {

    @NotNull(message = "subUseId is required")
    private Long subUseId;

    /** Vocabulary source; when null, generation uses generic common words. */
    private VocabSource source;
}
