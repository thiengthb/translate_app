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
import java.util.ArrayList;
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

    // ── Translate-page analysis: alternative translations ────────────────────

    /** 2–3 alternative translations of {@code sourceText} into the target language. */
    public List<String> alternatives(String sourceText, String referenceTranslation, String targetLangName) {
        String prompt = """
                You are a professional translator. Source text: "%s"
                A reference translation in %s is: "%s"
                Provide 2 alternative natural translations in %s that keep the SAME meaning but use different wording.
                Reply with ONLY a JSON array of strings and nothing else, e.g. ["...", "..."].
                """.formatted(safe(sourceText), targetLangName, safe(referenceTranslation), targetLangName);

        JsonNode node = parseJsonArray(generate(prompt, 0.7, 200));
        List<String> out = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode n : node) {
                String text = n.isTextual() ? n.asText() : n.path("text").asText("");
                text = text == null ? "" : text.trim();
                if (!text.isBlank() && !text.equals(referenceTranslation) && !out.contains(text)) {
                    out.add(text);
                }
                if (out.size() >= 3) {
                    break;
                }
            }
        }
        return out;
    }

    // ── Production drill: compose a prompt + reference from vocab + grammar ───

    /** A generated practice item: a situation in Vietnamese and a Japanese model answer. */
    public record GeneratedExercise(String situation, String l2Reference) {}

    private record ComposePayload(String situation, String l2Reference) {}

    /**
     * Compose ONE practice item for a target grammar point, optionally seeded with
     * the learner's vocabulary. Returns {@code null} when Gemini is unavailable or
     * the response cannot be parsed (the caller decides the fallback).
     */
    public GeneratedExercise compose(String jlptLevel, String nuance, String register,
                                     List<String> vocab, String mandatoryWord) {
        String vocabList = (vocab == null || vocab.isEmpty())
                ? "(any common words)"
                : String.join(", ", vocab);

        boolean hasMandatory = mandatoryWord != null && !mandatoryWord.isBlank();
        String wordLine = hasMandatory
                ? "MANDATORY vocabulary — the sentence MUST naturally include this exact word: " + mandatoryWord
                : "Suggested vocabulary (use AT LEAST ONE — one is enough; do NOT force the others): " + vocabList;
        String wordBullet = hasMandatory
                ? "- It MUST clearly use the grammar point AND include the mandatory word above."
                : "- It MUST clearly use the grammar point, and use at least one suggested word.";

        String prompt = """
                You are a Japanese teacher creating ONE short translation practice item for a
                JLPT %s learner whose native language is Vietnamese.

                MANDATORY grammar point (the Japanese answer MUST use it): %s
                Register: %s
                %s

                Keep it SIMPLE and on-point — this is the most important rule:
                - "l2Reference" must be exactly ONE short, natural sentence (a single clause,
                  two at most). NEVER multiple sentences.
                - It must express ONLY what the situation asks — NO greetings, NO apologies,
                  NO self-introduction, NO "よろしく…" pleasantries, NO flowery or over-humble
                  keigo. Plain polite (です/ます) is preferred.
                %s

                Produce:
                1. "situation": ONE short everyday situation in VIETNAMESE (1 sentence, addressed
                   to the learner as "Bạn ..."), answerable with the target grammar.
                2. "l2Reference": the single short Japanese sentence that answers it.

                Reply with ONLY this JSON, no other text:
                {"situation": "<vietnamese>", "l2Reference": "<japanese>"}
                """.formatted(safe(jlptLevel), safe(nuance), safe(register), wordLine, wordBullet);

        String raw = generate(prompt, 0.7, 200);
        if (raw == null) {
            return null;
        }
        try {
            ComposePayload p = mapper.readValue(extractJson(raw.trim()), ComposePayload.class);
            if (p == null || p.l2Reference() == null || p.l2Reference().isBlank()) {
                return null;
            }
            String situation = p.situation() == null ? "" : p.situation().trim();
            return new GeneratedExercise(situation, p.l2Reference().trim());
        } catch (Exception e) {
            log.warn("Gemini compose parse failed: {}", e.getMessage());
            return null;
        }
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
                            "maxOutputTokens", maxTokens));

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

    private JsonNode parseJsonArray(String raw) {
        if (raw == null) {
            return null;
        }
        String text = raw.trim();
        int start = text.indexOf('[');
        int end = text.lastIndexOf(']');
        String json = (start != -1 && end > start) ? text.substring(start, end + 1) : text;
        try {
            return mapper.readTree(json);
        } catch (Exception e) {
            log.warn("Gemini JSON-array parse failed: {}", e.getMessage());
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
