package com.example.starter_project_2025.system.dictionary;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Lấy câu ví dụ thực tế từ Tatoeba API (api_v0).
 * Chiến lược: ưu tiên bản dịch tiếng Việt, nếu chưa đủ thì bổ sung tiếng Anh.
 */
@Slf4j
@Component
public class TatoebaClient {

    private static final String SEARCH_URL = "https://tatoeba.org/en/api_v0/search";

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    public List<TatoebaExample> fetch(String word, int limit) {
        List<TatoebaExample> out = new ArrayList<>();
        Set<Long> seen = new LinkedHashSet<>();

        // Ưu tiên tiếng Việt trước, sau đó bổ sung tiếng Anh cho đủ limit.
        collect(word, "vie", limit, out, seen);
        if (out.size() < limit) {
            collect(word, "eng", limit - out.size(), out, seen);
        }
        return out;
    }

    /** Gọi Tatoeba cho 1 ngôn ngữ đích và nạp tối đa {@code want} câu mới vào {@code out}. */
    private void collect(String word, String lang, int want,
                         List<TatoebaExample> out, Set<Long> seen) {
        if (want <= 0) return;
        int added = 0;
        try {
            String url = SEARCH_URL
                    + "?from=jpn"
                    + "&to=" + lang
                    + "&query=" + URLEncoder.encode(word, StandardCharsets.UTF_8)
                    + "&sort=relevance";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "Mozilla/5.0 (compatible; DictionaryApp/1.0)")
                    .header("Accept", "application/json")
                    .GET()
                    .timeout(Duration.ofSeconds(8))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("[Tatoeba] {} status={} for word={}", lang, response.statusCode(), word);
                return;
            }

            JsonNode results = mapper.readTree(response.body()).path("results");
            if (!results.isArray()) return;

            for (JsonNode r : results) {
                if (added >= want) break;

                long id = r.path("id").asLong(-1);
                if (id < 0 || seen.contains(id)) continue;

                String japanese = r.path("text").asText(null);
                if (japanese == null || japanese.isBlank()) continue;

                String translation = firstTranslation(r, lang);
                if (translation == null) continue;

                out.add(TatoebaExample.builder()
                        .sentenceId(id)
                        .japanese(japanese)
                        .reading(firstTranscription(r))
                        .translation(translation)
                        .translationLang(lang)
                        .source("Tatoeba")
                        .build());
                seen.add(id);
                added++;
            }
        } catch (Exception e) {
            log.error("[Tatoeba] {} error for word={}: {} — {}",
                    lang, word, e.getClass().getSimpleName(), e.getMessage());
        }
    }

    /** Lấy bản dịch đầu tiên đúng ngôn ngữ trong mảng translations (mảng 2 chiều). */
    private String firstTranslation(JsonNode result, String lang) {
        JsonNode translations = result.path("translations");
        if (!translations.isArray()) return null;
        for (JsonNode group : translations) {
            if (!group.isArray()) continue;
            for (JsonNode t : group) {
                if (lang.equals(t.path("lang").asText(null))) {
                    String text = t.path("text").asText(null);
                    if (text != null && !text.isBlank()) return text;
                }
            }
        }
        return null;
    }

    /** Lấy phiên âm/furigana đầu tiên nếu có. */
    private String firstTranscription(JsonNode result) {
        JsonNode transcriptions = result.path("transcriptions");
        if (transcriptions.isArray() && !transcriptions.isEmpty()) {
            String text = transcriptions.get(0).path("text").asText(null);
            if (text != null && !text.isBlank()) return text;
        }
        return null;
    }
}