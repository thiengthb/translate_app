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

@Slf4j
@Component
public class OllamaClient {

    /** How long Ollama keeps the model resident in memory between calls. */
    private static final String KEEP_ALIVE = "30m";

    private final RestClient restClient;
    private final String apiUrl;
    private final String model;
    private final ObjectMapper mapper;

    public OllamaClient(
            RestClient.Builder builder,
            @Value("${ollama.api-url:http://localhost:11434/api/generate}") String apiUrl,
            @Value("${ollama.model:qwen2.5:3b}") String model,
            ObjectMapper mapper) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(3000);    // fail fast if Ollama isn't running
        requestFactory.setReadTimeout(60000);      // the first (cold) generation on CPU can take ~30-60s
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

    /**
     * Pre-load the model into memory so the first real drill request doesn't pay the
     * cold model-load cost. Best-effort: safe to call when Ollama is offline.
     */
    public void warmUp() {
        try {
            Map<String, Object> payload = Map.of(
                    "model", model,
                    "prompt", "ok",
                    "stream", false,
                    "keep_alive", KEEP_ALIVE,
                    "options", Map.of("num_predict", 1));
            readResponseField(payload);
            log.info("Ollama warm-up complete (model {})", model);
        } catch (Exception e) {
            log.warn("Ollama warm-up skipped: {}", e.getMessage());
        }
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
            Map<String, Object> payload = Map.of(
                    "model", model,
                    "prompt", prompt,
                    "stream", false,
                    "keep_alive", KEEP_ALIVE,
                    "options", Map.of(
                            "temperature", 0.2,    // grading wants to be near-deterministic
                            "num_predict", 200));

            String response = readResponseField(payload);
            if (response == null) return null;

            String json = extractJson(response.trim());
            log.info("Ollama raw response: {}", json);

            OllamaJudgePayload judged = mapper.readValue(json, OllamaJudgePayload.class);
            return toJudgeResult(judged);

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
            // A little temperature for variety; compose/alternatives want diverse output
            // (the strict judge builds its own deterministic request separately).
            Map<String, Object> payload = Map.of(
                    "model", model,
                    "prompt", prompt,
                    "stream", false,
                    "keep_alive", KEEP_ALIVE,     // keep the model resident → fast subsequent calls
                    "options", Map.of(
                            "temperature", 0.7,
                            "num_predict", 200));  // cap output: the item is one short sentence
            return readResponseField(payload);
        } catch (Exception e) {
            log.warn("Ollama generate failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * POST to Ollama and return its {@code response} text. Reads the raw response
     * body straight off the stream via {@code exchange()} and parses it ourselves —
     * bypassing HttpMessageConverter content-type negotiation, because some Ollama
     * builds reply with {@code application/octet-stream} which the converters reject.
     */
    private String readResponseField(Map<String, Object> payload) {
        return restClient.post()
                .uri(apiUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .exchange((request, response) -> {
                    if (!response.getStatusCode().is2xxSuccessful()) {
                        log.warn("Ollama HTTP {}", response.getStatusCode());
                        return null;
                    }
                    byte[] bytes = response.getBody().readAllBytes();
                    if (bytes.length == 0) {
                        return null;
                    }
                    OllamaRawResponse raw = mapper.readValue(
                            new String(bytes, StandardCharsets.UTF_8), OllamaRawResponse.class);
                    return raw == null ? null : raw.response();
                });
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
