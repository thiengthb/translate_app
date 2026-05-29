package com.example.starter_project_2025.system.dictionary;

import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@ResourceMenu(
        title = "Từ điển",
        group = "Tiếng Nhật",
        icon = "book",
        url = "/dictionary",
        order = 1
)
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dictionary")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Dictionary", description = "Tra từ tiếng Nhật từ database")
public class DictionaryController {

    DictionaryService dictionaryService;
    TatoebaClient     tatoebaClient;
    ForvoClient       forvoClient;

    private static final String GOOGLE_HWR_URL =
            "https://www.google.com/inputtools/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8";

    @GetMapping("/search")
    @Operation(summary = "Tìm kiếm từ theo kanji, kana, romaji hoặc nghĩa")
    public ResponseEntity<List<WordSearchResult>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "20") int limit) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(dictionaryService.search(q, Math.min(limit, 50)));
    }

    @GetMapping("/suggest")
    @Operation(summary = "Gợi ý từ theo tiền tố (dùng cho autocomplete)")
    public ResponseEntity<List<WordSuggestion>> suggest(
            @RequestParam String q,
            @RequestParam(defaultValue = "8") int limit) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(dictionaryService.suggest(q, Math.min(limit, 20)));
    }

    @GetMapping("/kanji-search")
    @Operation(summary = "Tìm kiếm và phân tích kanji từ từ vựng")
    public ResponseEntity<List<KanjiSearchResult>> kanjiSearch(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") int limit) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(dictionaryService.searchKanji(q, Math.min(limit, 20)));
    }

    @GetMapping("/featured")
    @Operation(summary = "Lấy từ vựng và kanji đề xuất cho trang chủ từ điển")
    public ResponseEntity<FeaturedResult> featured(
            @RequestParam(defaultValue = "8") int wordLimit,
            @RequestParam(defaultValue = "12") int kanjiLimit) {
        return ResponseEntity.ok(dictionaryService.featured(
                Math.min(wordLimit, 20),
                Math.min(kanjiLimit, 30)));
    }

    @GetMapping("/examples")
    @Operation(summary = "Lấy câu ví dụ thực tế từ Tatoeba (ưu tiên tiếng Việt, fallback tiếng Anh)")
    public ResponseEntity<List<TatoebaExample>> examples(
            @RequestParam String word,
            @RequestParam(defaultValue = "6") int limit) {
        if (word == null || word.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(tatoebaClient.fetch(word.trim(), Math.min(limit, 20)));
    }

    @GetMapping("/audio")
    @Operation(summary = "Lấy URL audio phát âm từ Forvo (rỗng nếu không có → frontend dùng TTS)")
    public ResponseEntity<WordAudio> audio(@RequestParam String word) {
        if (word == null || word.isBlank()) {
            return ResponseEntity.noContent().build();
        }
        return forvoClient.fetch(word.trim())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/handwriting")
    @Operation(summary = "Nhận diện chữ viết tay kanji (proxy tới Google Input Tools)")
    public ResponseEntity<List<String>> recognizeHandwriting(@RequestBody HandwritingRequest request) {
        if (request.getStrokes() == null || request.getStrokes().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        try {
            ObjectMapper mapper = new ObjectMapper();

            // Convert [[xs],[ys]] → [[xs],[ys],[ts]] — Google requires timestamps per point
            List<List<List<Integer>>> ink = request.getStrokes().stream()
                    .map(stroke -> {
                        List<Integer> xs = stroke.get(0);
                        List<Integer> ys = stroke.get(1);
                        List<Integer> ts = IntStream.range(0, xs.size())
                                .map(i -> i * 10)
                                .boxed()
                                .collect(Collectors.toList());
                        List<List<Integer>> s = new ArrayList<>();
                        s.add(xs);
                        s.add(ys);
                        s.add(ts);
                        return s;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> innerRequest = new LinkedHashMap<>();
            innerRequest.put("writing_guide", Map.of(
                    "writing_area_width", 272,
                    "writing_area_height", 272
            ));
            innerRequest.put("ink", ink);
            innerRequest.put("language", "ja");

            Map<String, Object> googleBody = new LinkedHashMap<>();
            googleBody.put("device", "featurephone");
            googleBody.put("options", "enable_pre_space");
            googleBody.put("requests", List.of(innerRequest));

            String bodyJson = mapper.writeValueAsString(googleBody);
            log.info("[Handwriting] {} stroke(s) → Google", request.getStrokes().size());
            log.info("[Handwriting] body: {}", bodyJson);

            HttpClient client = HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .connectTimeout(Duration.ofSeconds(8))
                    .build();

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(GOOGLE_HWR_URL))
                    .header("Content-Type", "application/json")
                    .header("User-Agent", "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36")
                    .header("Referer", "https://www.google.com/")
                    .header("Origin", "https://www.google.com")
                    .POST(HttpRequest.BodyPublishers.ofString(bodyJson, java.nio.charset.StandardCharsets.UTF_8))
                    .timeout(Duration.ofSeconds(8))
                    .build();

            HttpResponse<String> httpResponse = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            log.info("[Handwriting] Google status={} | response={}", httpResponse.statusCode(), httpResponse.body());

            @SuppressWarnings("unchecked")
            List<Object> data = mapper.readValue(httpResponse.body(), List.class);

            if ("SUCCESS".equals(data.get(0))) {
                @SuppressWarnings("unchecked")
                List<Object> outer = (List<Object>) data.get(1);
                @SuppressWarnings("unchecked")
                List<Object> first = (List<Object>) outer.get(0);
                @SuppressWarnings("unchecked")
                List<String> results = (List<String>) first.get(1);
                log.info("[Handwriting] Results: {}", results);
                return ResponseEntity.ok(results.subList(0, Math.min(results.size(), 10)));
            }
            log.warn("[Handwriting] Google non-SUCCESS: {}", data.get(0));
        } catch (Exception e) {
            log.error("[Handwriting] error: {} — {}", e.getClass().getSimpleName(), e.getMessage());
        }
        return ResponseEntity.ok(List.of());
    }
}
