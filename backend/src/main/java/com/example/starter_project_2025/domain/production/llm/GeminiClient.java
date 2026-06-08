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

    private record JudgePayload(double score, String correction, String feedback) {}

    private record ComposePayload(String situation, List<String> words, String register, String l2Reference) {}

    public boolean isAvailable() {
        return !apiKey.isBlank();
    }

    /**
     * Compose ONE fresh production exercise for a grammar point: a Vietnamese situation
     * prompt + hint words + register + a model Japanese answer that uses the target grammar.
     * Returns {@code null} when no API key is set or the call fails, so the caller falls back
     * to the curated/seeded pool exactly as it did when generation was offline.
     */
    public ComposedExercise compose(String grammarName, String jlptLevel, String nuance, List<String> words) {
        String wordList = (words == null || words.isEmpty())
                ? "(none — choose natural common words yourself)"
                : String.join(", ", words);

        String prompt = """
                You write SHORT Japanese sentence-composition exercises for a Vietnamese learner.
                Target grammar point: %s (JLPT %s).
                Nuance / usage: %s
                Vocabulary the learner is studying (use 1-2 if they fit naturally, ignore the rest): %s

                Produce exactly ONE exercise:
                - "situation": a ONE-sentence prompt in VIETNAMESE describing a real-life situation and
                  what the learner must say. Do NOT reveal the Japanese answer inside it.
                - "words": 1-3 Japanese hint words (kanji/kana).
                - "register": "polite" or "casual".
                - "l2Reference": the model answer in natural Japanese that CLEARLY uses the target grammar
                  point above and matches the situation and register.

                Reply with ONLY this JSON, no other text:
                {"situation":"<một câu tiếng Việt>","words":["<từ>"],"register":"polite","l2Reference":"<câu tiếng Nhật>"}
                """.formatted(safe(grammarName), safe(jlptLevel), safe(nuance), wordList);

        try {
            String response = generate(prompt, 0.9, 500);
            if (response == null) return null;

            String json = extractJson(response.trim());
            log.info("Gemini compose response: {}", json);

            ComposePayload p = mapper.readValue(json, ComposePayload.class);
            if (p == null || isBlank(p.situation()) || isBlank(p.l2Reference())) {
                return null;
            }
            String register = isBlank(p.register()) ? "polite" : p.register().trim();
            List<String> hintWords = p.words() == null ? List.of() : p.words();
            return new ComposedExercise(p.situation().trim(), hintWords, register, p.l2Reference().trim());

        } catch (Exception e) {
            log.warn("Gemini compose failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Grade a learner's sentence on a 0-10 scale (one decimal) covering meaning + correct use of
     * the target grammar + naturalness, returning a personalized correction of THEIR sentence plus
     * constructive Vietnamese feedback. Returns {@code null} on no API key / network / parse error
     * so the caller degrades to a detector-only verdict.
     */
    public JudgeResult judge(String grammarName, String refL2, String answer, String nuance,
                             List<CommonMistake> commonMistakes) {
        StringBuilder mistakes = new StringBuilder();
        if (commonMistakes != null) {
            for (CommonMistake cm : commonMistakes) {
                mistakes.append("- ").append(cm.getPattern()).append(": ").append(cm.getHint()).append("\n");
            }
        }

        String prompt = """
                You are a strict but supportive Japanese teacher grading a Vietnamese learner's
                sentence-composition answer. Grade it AND give feedback that helps them improve.

                Target grammar point (the learner must use this): %s
                Grammar nuance / usage: %s
                Reference model answer (100%% correct & natural): %s
                Learner's answer: %s
                Common mistakes to watch for:
                %s

                Give a "score" from 0 to 10 (one decimal allowed) that reflects ALL THREE together:
                1) MEANING — same meaning as the reference?
                2) TARGET GRAMMAR — does it actually use the target grammar point above, correctly?
                3) NATURALNESS — natural Japanese: correct particles, conjugation, word choice?

                Rubric anchors:
                - 0    = empty, gibberish, romaji-only, isolated words only, or a different language.
                - 2-3  = a few related words but not a real sentence, or the meaning is wrong.
                - 5    = right idea but the TARGET GRAMMAR is missing/misused, or a key meaning piece is wrong.
                - 7-8  = correct meaning and uses the target grammar, but unnatural OR a particle/conjugation slip.
                - 9    = correct and natural, only a trivial issue.
                - 10   = matches the reference in meaning and naturalness; target grammar used correctly.

                Hard rules:
                - "hahaha", keyboard mashing, random letters, or romaji-only = 0.
                - If the answer is just isolated words / hint words with no real grammar (e.g. "寝る 時間"), score <= 2.
                - Do NOT give 9-10 unless the target grammar is used correctly AND the meaning matches.

                Then provide:
                - "correction": a MINIMAL edit of the LEARNER'S OWN sentence — keep their vocabulary, word order
                  and phrasing wherever it is already acceptable, and change ONLY the actual errors so it becomes
                  correct, natural Japanese using the target grammar. Do NOT paraphrase it into the reference
                  sentence above. Only when their answer is empty, gibberish, or just isolated words with nothing
                  to preserve may you fall back to a full correct sentence. If it is already correct, repeat it unchanged.
                - "feedback": 2-4 short sentences in VIETNAMESE. Name the concrete mistakes (trợ từ, chia đuôi
                  động từ, từ vựng, sắc thái, hoặc thiếu mẫu ngữ pháp mục tiêu), explain briefly WHY it is wrong,
                  and give one tip so they get it right next time. If correct, praise briefly and note one nuance.

                Reply with ONLY this JSON, no other text:
                {"score": <number 0-10>, "correction": "<câu tiếng Nhật đã sửa>", "feedback": "<2-4 câu tiếng Việt>"}
                """.formatted(safe(grammarName), safe(nuance), safe(refL2), safe(answer), mistakes.toString());

        try {
            String response = generate(prompt, 0.2, 600);
            if (response == null) return null;

            String json = extractJson(response.trim());
            log.info("Gemini judge response: {}", json);

            JudgePayload judged = mapper.readValue(json, JudgePayload.class);
            return toJudgeResult(judged);

        } catch (Exception e) {
            log.warn("Gemini judge failed: {}", e.getMessage());
            return null;
        }
    }

    private JudgeResult toJudgeResult(JudgePayload p) {
        double clamped = Math.max(0.0, Math.min(10.0, p.score()));
        double score = clamped / 10.0;  // normalize 0-10 → 0.0-1.0 for the verdict thresholds
        String verdict = clamped >= 8.5 ? "PASS" : (clamped >= 6.5 ? "PARTIAL" : "FAIL");
        return JudgeResult.builder()
                .meaningScore(score)
                .pointUsed(clamped >= 6.5)
                .grammarOk(clamped >= 6.5)
                .verdict(verdict)
                .correction(p.correction() == null ? "" : p.correction().trim())
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

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
