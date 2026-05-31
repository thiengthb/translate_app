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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class OllamaClient {

    private final RestClient restClient;
    private final String apiUrl;
    private final String model;
    private final ObjectMapper mapper;

    public OllamaClient(
            RestClient.Builder builder,
            @Value("${ollama.api-url:http://localhost:11434/api/generate}") String apiUrl,
            @Value("${ollama.model:qwen2.5-coder:3b}") String model,
            ObjectMapper mapper) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(3000);   // fail fast if Ollama isn't running
        requestFactory.setReadTimeout(25000);      // generous: small model can be slow on first call
        this.restClient = builder.requestFactory(requestFactory).build();
        this.apiUrl = apiUrl;
        this.model = model;
        this.mapper = mapper;
    }

    private record OllamaRawResponse(String response) {}

    private record OllamaJudgePayload(int meaningScore, String feedback) {}

    public boolean isAvailable() {
        return true;
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
            Map<String, Object> body = Map.of(
                    "model", model,
                    "prompt", prompt,
                    "stream", false);

            OllamaRawResponse raw = restClient.post()
                    .uri(apiUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(OllamaRawResponse.class);

            if (raw == null || raw.response() == null) return null;

            String json = extractJson(raw.response().trim());
            log.info("Ollama raw response: {}", json);

            OllamaJudgePayload payload = mapper.readValue(json, OllamaJudgePayload.class);
            return toJudgeResult(payload);

        } catch (Exception e) {
            log.warn("Ollama judge failed: {}", e.getMessage());
            return null;
        }
    }

    private JudgeResult toJudgeResult(OllamaJudgePayload p) {
        int clamped = Math.max(0, Math.min(100, p.meaningScore()));
        double score = clamped / 100.0;
        String verdict = clamped >= 80 ? "PASS" : (clamped >= 50 ? "PARTIAL" : "FAIL");
        return JudgeResult.builder()
                .meaningScore(score)
                .pointUsed(clamped >= 60)
                .grammarOk(clamped >= 60)
                .verdict(verdict)
                .feedback("[AI Offline] " + (p.feedback() == null ? "" : p.feedback()))
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

        JsonNode node = parseJsonArray(generate(prompt));
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

    /** A generated practice item: an English situation and a Japanese model answer. */
    public record GeneratedExercise(String situation, String l2Reference) {}

    private record ComposePayload(String situation, String l2Reference) {}

    /**
     * Compose ONE practice item for a target grammar point, optionally seeded with
     * the learner's vocabulary. Returns {@code null} when Ollama is unavailable or
     * the response cannot be parsed (the caller decides the fallback).
     */
    public GeneratedExercise compose(String jlptLevel, String nuance, String register, List<String> vocab) {
        String vocabList = (vocab == null || vocab.isEmpty())
                ? "(any common words)"
                : String.join(", ", vocab);

        String prompt = """
                You are a Japanese teacher writing ONE translation practice item for a JLPT %s learner.
                The learner MUST practice this grammar point: %s
                Register: %s
                Vocabulary the learner is studying (try to use 2-3 of them naturally): %s

                Produce:
                1. "situation": ONE short real-life situation in ENGLISH (1-2 sentences, addressed to the
                   learner as "You ..."), that naturally REQUIRES the target grammar to answer.
                2. "l2Reference": a natural JAPANESE model answer that (a) actually uses the target grammar,
                   (b) uses some of the vocabulary above, (c) matches the register.

                Reply with ONLY this JSON, no other text:
                {"situation": "<english>", "l2Reference": "<japanese>"}
                """.formatted(safe(jlptLevel), safe(nuance), safe(register), vocabList);

        String raw = generate(prompt);
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
            log.warn("Ollama compose parse failed: {}", e.getMessage());
            return null;
        }
    }

    private String generate(String prompt) {
        try {
            Map<String, Object> body = Map.of("model", model, "prompt", prompt, "stream", false);
            OllamaRawResponse raw = restClient.post()
                    .uri(apiUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(OllamaRawResponse.class);
            return raw == null ? null : raw.response();
        } catch (Exception e) {
            log.warn("Ollama generate failed: {}", e.getMessage());
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
            log.warn("Ollama JSON-array parse failed: {}", e.getMessage());
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
