package com.example.starter_project_2025.domain.production.llm;

import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.ScenarioStub;
import com.example.starter_project_2025.domain.production.grammar.model.CommonMistake;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class GeminiClient {

    private final String apiKey;
    private final String model;
    private final String baseUrl;
    private final RestClient restClient = RestClient.create();
    private final ObjectMapper mapper = new ObjectMapper();

    public GeminiClient(
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.model:gemini-2.5-flash}") String model,
            @Value("${gemini.base-url:https://generativelanguage.googleapis.com/v1beta}") String baseUrl) {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }

    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String generatePrompt(GrammarSubUse subUse, ScenarioStub scenario, String markerHint) {
        String instruction = """
                You are creating an English production exercise for a Japanese learner.
                Produce a short English prompt with EXACTLY three labelled blocks:
                [SITUATION] 1-2 sentences of concrete context (who/where/what must be said).
                [WORDS] optional vocabulary glosses, or "free".
                [REGISTER] the politeness level.

                Hard rules:
                - The situation must make the target grammar the only natural way to answer.
                - Do NOT reveal the grammar pattern in English (no "must" when drilling obligation, etc).
                - Keep it learnable, one situation only.

                Target grammar nuance: %s
                Scenario: %s
                Register: %s
                Suggested form (do not reveal to learner): %s
                """.formatted(
                safe(subUse.getNuanceDescription()),
                safe(scenario.getSituationContext()),
                safe(scenario.getRegister()),
                safe(markerHint));

        String text = call(instruction, false);
        return text == null ? null : text.trim();
    }

    public JudgeResult judge(String referenceL2, String userAnswer, String nuance, List<CommonMistake> commonMistakes) {
        StringBuilder mistakes = new StringBuilder();
        if (commonMistakes != null) {
            for (CommonMistake cm : commonMistakes) {
                mistakes.append("- ").append(cm.getPattern()).append(": ").append(cm.getHint()).append("\n");
            }
        }

        String instruction = """
                You are grading a Japanese learner's sentence. Reply with ONLY a JSON object:
                {"meaningScore": <0..1>, "pointUsed": <bool>, "grammarOk": <bool>, "verdict": "PASS|PARTIAL|FAIL", "feedback": "<short Vietnamese feedback>"}

                Target grammar nuance: %s
                Reference Japanese sentence: %s
                Learner's answer: %s
                Common mistakes to watch for:
                %s
                meaningScore = semantic closeness to the reference meaning.
                pointUsed = did the learner use the target grammar nuance.
                grammarOk = is the sentence grammatical.
                feedback in Vietnamese, concise and specific.
                """.formatted(safe(nuance), safe(referenceL2), safe(userAnswer), mistakes.toString());

        String text = call(instruction, true);
        if (text == null) return null;
        try {
            JsonNode n = mapper.readTree(text);
            return JudgeResult.builder()
                    .meaningScore(n.path("meaningScore").asDouble(0))
                    .pointUsed(n.path("pointUsed").asBoolean(false))
                    .grammarOk(n.path("grammarOk").asBoolean(false))
                    .verdict(n.path("verdict").asText("FAIL"))
                    .feedback(n.path("feedback").asText(""))
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse Gemini judge response: {}", e.getMessage());
            return null;
        }
    }

    private String call(String prompt, boolean jsonMode) {
        if (!isAvailable()) return null;
        try {
            Map<String, Object> generationConfig = jsonMode
                    ? Map.of("responseMimeType", "application/json")
                    : Map.of();

            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                    "generationConfig", generationConfig);

            String url = baseUrl + "/models/" + model + ":generateContent?key=" + apiKey;

            String response = restClient.post()
                    .uri(url)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = mapper.readTree(response);
            return root.path("candidates").path(0)
                    .path("content").path("parts").path(0)
                    .path("text").asText(null);
        } catch (Exception e) {
            log.warn("Gemini call failed: {}", e.getMessage());
            return null;
        }
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }
}
