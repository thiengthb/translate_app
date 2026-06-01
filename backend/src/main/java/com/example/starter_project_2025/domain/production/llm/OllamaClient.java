package com.example.starter_project_2025.domain.production.llm;

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
 * LLM client backed by Ollama (local, offline). Provides only the {@code alternatives()}
 * method for generating alternative translations. Other LLM tasks (judge, compose) use
 * GeminiClient and are unaffected.
 *
 * <p>When Ollama is not running, all calls return {@code null} and callers degrade gracefully.
 */
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
            @Value("${ollama.model:qwen:7b}") String model,
            ObjectMapper mapper) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(3000);    // fail fast if Ollama isn't running
        requestFactory.setReadTimeout(60000);      // generation can take ~30-60s on CPU
        this.restClient = builder.requestFactory(requestFactory).build();
        this.apiUrl = apiUrl;
        this.model = model;
        this.mapper = mapper;
    }

    private record OllamaRawResponse(String response) {}

    public boolean isAvailable() {
        return true;  // Assume Ollama is available; will return null if not
    }

    // ── Translation-page analysis: alternative translations ────────────────────

    /** 2–3 alternative translations of {@code sourceText} into the target language. */
    public List<String> alternatives(String sourceText, String referenceTranslation, String targetLangName) {
        // Deliberately short prompt — qwen:7b follows a simpler instruction more reliably.
        // num_predict=512: Japanese ≈ 2-3 tokens/char; 2 sentences + JSON ≈ 150-300 tokens.
        String prompt = """
                Translate the following text into %s. Give exactly 2 alternative translations (different wording, same meaning).
                Text: "%s"
                Reference translation: "%s"
                Reply with ONLY a JSON array of 2 strings, e.g. ["translation 1","translation 2"]. No explanation.
                """.formatted(targetLangName, safe(sourceText), safe(referenceTranslation));

        String raw = generate(prompt, 0.7, 512);
        log.info("[alternatives] Ollama raw ({} chars): {}", raw == null ? 0 : raw.length(),
                raw == null ? "null" : raw.substring(0, Math.min(raw.length(), 200)));
        JsonNode node = parseJsonArray(raw);
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

    /**
     * POST one prompt to the Ollama API and return the response text.
     * Returns {@code null} when Ollama is unavailable or the call fails, so the caller
     * degrades gracefully (returns empty alternatives list).
     */
    private String generate(String prompt, double temperature, int maxTokens) {
        try {
            Map<String, Object> payload = Map.of(
                    "model", model,
                    "prompt", prompt,
                    "stream", false,
                    "keep_alive", KEEP_ALIVE,
                    "options", Map.of(
                            "temperature", temperature,
                            "num_predict", maxTokens));

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
        if (start == -1 || end <= start) {
            log.warn("[parseJsonArray] No JSON array brackets found in: {}",
                    text.substring(0, Math.min(text.length(), 200)));
            return null;
        }
        String json = text.substring(start, end + 1);
        try {
            return mapper.readTree(json);
        } catch (Exception e) {
            log.warn("[parseJsonArray] Parse failed on '{}': {}",
                    json.substring(0, Math.min(json.length(), 200)), e.getMessage());
            return null;
        }
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }
}
