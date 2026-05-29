package com.example.starter_project_2025.system.dictionary;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

/**
 * Lấy URL audio phát âm người thật từ Forvo (https://forvo.com).
 * Cần biến môi trường FORVO_API_KEY; nếu trống thì luôn trả về rỗng
 * và frontend sẽ tự fallback về Web Speech API.
 */
@Slf4j
@Component
public class ForvoClient {

    private final String apiKey;

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(6))
            .build();

    public ForvoClient(@Value("${forvo.api-key:}") String apiKey) {
        this.apiKey = apiKey;
    }

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    public Optional<WordAudio> fetch(String word) {
        if (!isEnabled()) return Optional.empty();
        try {
            String url = "https://apifree.forvo.com"
                    + "/key/" + apiKey
                    + "/format/json"
                    + "/action/word-pronunciations"
                    + "/word/" + URLEncoder.encode(word, StandardCharsets.UTF_8)
                    + "/language/ja"
                    + "/order/rate-desc"
                    + "/limit/1";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "Mozilla/5.0 (compatible; DictionaryApp/1.0)")
                    .header("Accept", "application/json")
                    .GET()
                    .timeout(Duration.ofSeconds(6))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("[Forvo] status={} for word={}", response.statusCode(), word);
                return Optional.empty();
            }

            JsonNode items = mapper.readTree(response.body()).path("items");
            if (items.isArray() && !items.isEmpty()) {
                String mp3 = items.get(0).path("pathmp3").asText(null);
                if (mp3 != null && !mp3.isBlank()) {
                    return Optional.of(WordAudio.builder().url(mp3).source("forvo").build());
                }
            }
        } catch (Exception e) {
            log.error("[Forvo] error for word={}: {} — {}",
                    word, e.getClass().getSimpleName(), e.getMessage());
        }
        return Optional.empty();
    }
}