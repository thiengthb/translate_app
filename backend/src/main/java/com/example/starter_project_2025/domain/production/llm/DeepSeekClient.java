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
import java.util.List;
import java.util.Map;

/**
 * Minimal DeepSeek client (OpenAI-compatible chat completions API), used for
 * bulk translation where Gemini's free-tier request quota (~20/day/model) is
 * the bottleneck — DeepSeek has no hard rate limits and is pay-per-token.
 *
 * <p>Auth via the {@code DEEPSEEK_API_KEY} env var. When the key is blank every
 * call returns {@code null} and callers fall back (e.g. to Gemini).</p>
 */
@Slf4j
@Component
public class DeepSeekClient {

    private static final String URL = "https://api.deepseek.com/chat/completions";

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final ObjectMapper mapper;

    public DeepSeekClient(
            RestClient.Builder builder,
            @Value("${deepseek.api-key:}") String apiKey,
            @Value("${deepseek.model:deepseek-chat}") String model,
            ObjectMapper mapper) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(180000); // large batches can take a while
        this.restClient = builder.requestFactory(requestFactory).build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.mapper = mapper;
    }

    public boolean isAvailable() {
        return !apiKey.isBlank();
    }

    /**
     * Batch-translate Japanese sentences into natural Vietnamese (English gloss
     * for disambiguation only). Returns a list aligned 1:1 with the input —
     * entries the model skipped are {@code null} (caller retries them later).
     * Returns {@code null} only on hard failure (no key / network / parse).
     *
     * <p>Same index-keyed protocol as the Gemini variant: JSON-mode replies of
     * {@code {"items":[{"i":N,"vi":"…"}, …]}} so one merged/skipped item cannot
     * invalidate the whole batch.</p>
     */
    public List<String> translateToVietnamese(List<String> japanese, List<String> english) {
        if (apiKey.isBlank() || japanese == null || japanese.isEmpty()) {
            return null;
        }
        int n = japanese.size();
        StringBuilder items = new StringBuilder();
        for (int i = 0; i < n; i++) {
            items.append(i + 1).append(". JA: ").append(japanese.get(i) == null ? "" : japanese.get(i));
            if (english != null && i < english.size() && english.get(i) != null) {
                items.append("  (EN: ").append(english.get(i)).append(")");
            }
            items.append("\n");
        }

        String prompt = """
                Translate each numbered Japanese sentence below into natural, concise Vietnamese.
                Use the English gloss only to disambiguate meaning; translate the Japanese, not the English.
                Keep it faithful and natural (no notes, no romaji).
                Sentences may look similar — translate EVERY numbered item separately, never merge or skip.

                Reply with ONLY this json shape, one object per input number, all %d of them:
                {"items":[{"i":1,"vi":"<câu tiếng Việt>"},{"i":2,"vi":"<câu tiếng Việt>"}, ...]}

                Sentences:
                %s
                """.formatted(n, items.toString());

        try {
            Map<String, Object> payload = Map.of(
                    "model", model,
                    "messages", List.of(Map.of("role", "user", "content", prompt)),
                    "temperature", 0.3,
                    "max_tokens", Math.min(8000, 200 + n * 45),
                    "response_format", Map.of("type", "json_object"));

            String body = restClient.post()
                    .uri(URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(payload)
                    .exchange((request, response) -> {
                        byte[] bytes = response.getBody().readAllBytes();
                        String text = new String(bytes, StandardCharsets.UTF_8);
                        if (!response.getStatusCode().is2xxSuccessful()) {
                            log.warn("DeepSeek HTTP {}: {}", response.getStatusCode(),
                                    text.length() > 400 ? text.substring(0, 400) : text);
                            return null;
                        }
                        return text;
                    });
            if (body == null) {
                return null;
            }

            JsonNode content = mapper.readTree(body)
                    .path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.asText().isBlank()) {
                log.warn("DeepSeek: empty completion content");
                return null;
            }
            JsonNode itemsNode = mapper.readTree(content.asText()).path("items");
            if (!itemsNode.isArray()) {
                log.warn("DeepSeek: response JSON has no items array");
                return null;
            }

            String[] out = new String[n];
            int filled = 0;
            for (JsonNode item : itemsNode) {
                int i = item.path("i").asInt(-1);
                String vi = item.path("vi").asText(null);
                if (i >= 1 && i <= n && vi != null && !vi.isBlank()) {
                    if (out[i - 1] == null) filled++;
                    out[i - 1] = vi.trim();
                }
            }
            if (filled < n) {
                log.info("DeepSeek VI translate: {}/{} items returned (missing rows retried later)", filled, n);
            }
            return java.util.Arrays.asList(out);
        } catch (Exception e) {
            log.warn("DeepSeek VI translate failed: {}", e.getMessage());
            return null;
        }
    }
}
