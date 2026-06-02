package com.example.starter_project_2025.domain.production.llm;

import com.example.starter_project_2025.domain.production.grammar.model.CommonMistake;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * LLM client backed by the Google Gemini generateContent REST API. Replaces
 * the previous Anthropic Claude provider — same public surface (judge / alternatives /
 * compose) so callers are unchanged.
 *
 * <p>Auth uses the {@code GEMINI_API_KEY} env var via {@code x-goog-api-key} header.
 * When the key is blank every call returns {@code null} and callers fall back exactly
 * as they did when the previous LLM was offline — no crash, just degraded UX.
 */
@Slf4j
@Component
public class GeminiClient {

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final ObjectMapper mapper;

    public GeminiClient(
            RestClient.Builder builder,
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.model:gemini-2.0-flash}") String model,
            ObjectMapper mapper) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(60000);
        this.restClient = builder.requestFactory(requestFactory).build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.mapper = mapper;
    }

    private record JudgePayload(int meaningScore, String feedback) {}

    public boolean isAvailable() {
        return !apiKey.isBlank();
    }

    public JudgeResult judge(String refL2, String answer, String nuance, List<CommonMistake> commonMistakes) {
        StringBuilder mistakes = new StringBuilder();
        if (commonMistakes != null) {
            for (CommonMistake cm : commonMistakes) {
                mistakes.append("- ").append(cm.getPattern()).append(": ").append(cm.getHint()).append("\n");
            }
        }

        String prompt = """
                You are a STRICT Japanese translation grader. Compare the learner's sentence to the
                reference model answer and score SEMANTIC ACCURACY (does it convey the same meaning?).

                Reference (model answer, 100%% correct): %s
                Learner's answer: %s
                Target grammar nuance: %s
                Common mistakes to watch for:
                %s

                Score on a 0-100 integer scale, and BE HARSH:
                - 0   = empty, gibberish, romaji-only, or a completely unrelated/other language
                - 20  = a few related words but the meaning is wrong
                - 50  = roughly the right idea but a key piece of meaning is missing or distorted
                - 75  = correct core meaning, but unnatural OR a noticeable nuance/particle error
                - 90  = correct and natural, only a trivial issue
                - 100 = matches the reference meaning exactly and naturally

                Hard rules:
                - "hahaha", keyboard mashing, or random letters = 0.
                - Off-topic Japanese (grammatical but wrong meaning) = 0-20.
                - If ANY important information from the reference is missing or contradicted, cap the score at 60.
                - Do NOT give 80+ unless the meaning is genuinely equivalent to the reference.
                - Judge meaning only; do not reward extra politeness or length.

                Reply with ONLY this JSON, no other text. The feedback must be ONE short Vietnamese
                sentence that names the concrete problem (or confirms it is correct):
                {"meaningScore": <integer 0-100>, "feedback": "<one short sentence in Vietnamese>"}
                """.formatted(safe(refL2), safe(answer), safe(nuance), mistakes.toString());

        try {
            String response = generate(prompt, 0.2, 200);
            if (response == null) return null;

            String json = extractJson(response.trim());
            log.info("Gemini raw response: {}", json);

            JudgePayload judged = mapper.readValue(json, JudgePayload.class);
            return toJudgeResult(judged);

        } catch (Exception e) {
            log.warn("Gemini judge failed: {}", e.getMessage());
            return null;
        }
    }

    private JudgeResult toJudgeResult(JudgePayload p) {
        int clamped = Math.max(0, Math.min(100, p.meaningScore()));
        double score = clamped / 100.0;
        String verdict = clamped >= 80 ? "PASS" : (clamped >= 50 ? "PARTIAL" : "FAIL");
        return JudgeResult.builder()
                .meaningScore(score)
                .pointUsed(clamped >= 60)
                .grammarOk(clamped >= 60)
                .verdict(verdict)
                .feedback(p.feedback() == null ? "" : p.feedback())
                .build();
    }

    /**
     * POST one user message to the Gemini generateContent REST API and return the
     * first text part of the reply. Returns {@code null} when no API key is configured
     * or the call fails, so every caller degrades to its offline fallback.
     */
    private String generate(String prompt, double temperature, int maxTokens) {
        if (apiKey.isBlank()) {
            log.warn("Gemini call skipped: GEMINI_API_KEY is not set");
            return null;
        }
        try {
            String url = BASE_URL + model + ":generateContent";
            Map<String, Object> payload = Map.of(
                    "contents", List.of(Map.of(
                            "role", "user",
                            "parts", List.of(Map.of("text", prompt)))),
                    "generationConfig", Map.of(
                            "temperature", temperature,
                            "maxOutputTokens", maxTokens,
                            // gemini-flash-latest is a 2.5 "thinking" model; with our small
                            // maxOutputTokens the thinking budget would consume the whole
                            // response and return empty content. Disable thinking for these
                            // short structured-JSON tasks (compose/judge/alternatives).
                            "thinkingConfig", Map.of("thinkingBudget", 0)));

            return restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("x-goog-api-key", apiKey)
                    .body(payload)
                    .exchange((request, response) -> {
                        if (!response.getStatusCode().is2xxSuccessful()) {
                            byte[] err = response.getBody().readAllBytes();
                            log.warn("Gemini HTTP {}: {}", response.getStatusCode(),
                                    new String(err, StandardCharsets.UTF_8));
                            return null;
                        }
                        byte[] bytes = response.getBody().readAllBytes();
                        if (bytes.length == 0) {
                            return null;
                        }
                        return extractText(new String(bytes, StandardCharsets.UTF_8));
                    });
        } catch (Exception e) {
            log.warn("Gemini generate failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Parse the Gemini response body and concatenate all text parts from the first
     * candidate's content.
     * Response shape: {@code {"candidates":[{"content":{"parts":[{"text":"..."}]}}]}}
     */
    private String extractText(String body) {
        try {
            JsonNode parts = mapper.readTree(body)
                    .path("candidates").path(0)
                    .path("content").path("parts");
            if (!parts.isArray()) {
                return null;
            }
            StringBuilder sb = new StringBuilder();
            for (JsonNode part : parts) {
                sb.append(part.path("text").asText(""));
            }
            String text = sb.toString();
            return text.isBlank() ? null : text;
        } catch (Exception e) {
            log.warn("Gemini response parse failed: {}", e.getMessage());
            return null;
        }
    }

    private String extractJson(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            return text.substring(start, end + 1);
        }
        return text;
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }
}
