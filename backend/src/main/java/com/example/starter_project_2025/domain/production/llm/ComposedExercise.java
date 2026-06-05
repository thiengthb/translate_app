package com.example.starter_project_2025.domain.production.llm;

import java.util.List;

/**
 * One freshly AI-composed production exercise (the LLM "compose" task).
 *
 * @param situation   a one-sentence prompt in the learner's L1 (Vietnamese) describing what to say
 * @param words       1-3 Japanese hint words to show on the [WORDS] line
 * @param register    "polite" or "casual"
 * @param l2Reference the model Japanese answer that uses the target grammar point
 */
public record ComposedExercise(String situation, List<String> words, String register, String l2Reference) {
}
