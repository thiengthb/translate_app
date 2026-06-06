package com.example.starter_project_2025.domain.production.api;

import com.example.starter_project_2025.domain.production.vocab.VocabSource;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GenerateExerciseRequest {

    /** Grammar point to drill; {@code null} = random mode (server picks one). */
    private Long subUseId;

    /** Vocabulary source; when null, generation uses generic common words. */
    private VocabSource source;
}
