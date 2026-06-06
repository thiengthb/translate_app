package com.example.starter_project_2025.system.translate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Thin proxy over the DeepL REST API (https://www.deepl.com/docs-api).
 *
 * The API key lives only on the server (env var {@code DEEPL_API_KEY}) so it is
 * never shipped to the browser; DeepL also rejects cross-origin browser calls,
 * which makes a backend proxy mandatory. A {@code :fx} key is a Free-tier key,
 * served from {@code https://api-free.deepl.com}.
 *
 * Built with the native {@link HttpClient} to stay consistent with the existing
 * external-API clients in this codebase (see ForvoClient).
 */
@Slf4j
@Component
public class DeepLClient {

    private final String apiKey;
    private final String baseUrl;

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    public DeepLClient(
            @Value("${DEEPL_API_KEY:}") String apiKey,
            @Value("${DEEPL_API_URL:https://api-free.deepl.com}") String baseUrl
    ) {
        this.apiKey = apiKey;
        // tolerate a trailing slash in config
        this.baseUrl = baseUrl != null && baseUrl.endsWith("/")
                ? baseUrl.substring(0, baseUrl.length() - 1)
                : baseUrl;
    }

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Translate a single text. {@code sourceLang} may be null/blank to let DeepL
     * auto-detect; {@code formality} may be null (only honoured for supported
     * target languages, ignored otherwise by DeepL).
     */
    public TranslateResponse translate(String text, String sourceLang, String targetLang, String formality) {
        requireEnabled();

        StringBuilder form = new StringBuilder();
        appendParam(form, "text", text);
        appendParam(form, "target_lang", targetLang);
        if (sourceLang != null && !sourceLang.isBlank()) {
            appendParam(form, "source_lang", sourceLang);
        }
        if (formality != null && !formality.isBlank() && !"default".equalsIgnoreCase(formality)) {
            appendParam(form, "formality", formality);
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/v2/translate"))
                .header("Authorization", "DeepL-Auth-Key " + apiKey)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("User-Agent", "starter_project_2025/1.0")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(form.toString(), StandardCharsets.UTF_8))
                .build();

        JsonNode body = send(request, "translate");
        JsonNode first = body.path("translations").path(0);
        if (first.isMissingNode()) {
            log.error("[DeepL] unexpected translate response: {}", body);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "DeepL returned no translation");
        }

        return new TranslateResponse(
                first.path("text").asText(""),
                first.path("detected_source_language").asText(null),
                targetLang
        );
    }

    /** Fetch the list of languages DeepL supports. {@code type} is "source" or "target". */
    public List<LanguageOption> languages(String type) {
        requireEnabled();

        String resolvedType = "source".equalsIgnoreCase(type) ? "source" : "target";
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/v2/languages?type=" + resolvedType))
                .header("Authorization", "DeepL-Auth-Key " + apiKey)
                .header("User-Agent", "starter_project_2025/1.0")
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();

        JsonNode body = send(request, "languages");
        List<LanguageOption> result = new ArrayList<>();
        if (body.isArray()) {
            for (JsonNode node : body) {
                result.add(new LanguageOption(
                        node.path("language").asText(""),
                        node.path("name").asText(""),
                        node.path("supports_formality").asBoolean(false)
                ));
            }
        }
        return result;
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private void requireEnabled() {
        if (!isEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Translation is not configured (missing DEEPL_API_KEY)");
        }
    }

    private JsonNode send(HttpRequest request, String op) {
        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 200) {
                return mapper.readTree(response.body());
            }
            log.warn("[DeepL] {} status={} body={}", op, status, response.body());
            // surface the most common DeepL errors with a meaningful status
            HttpStatus mapped = switch (status) {
                case 403 -> HttpStatus.BAD_GATEWAY;          // bad/unauthorized key
                case 456 -> HttpStatus.TOO_MANY_REQUESTS;    // quota exceeded
                case 429 -> HttpStatus.TOO_MANY_REQUESTS;
                case 400 -> HttpStatus.BAD_REQUEST;          // e.g. unsupported language
                default -> HttpStatus.BAD_GATEWAY;
            };
            throw new ResponseStatusException(mapped, "DeepL " + op + " failed (status " + status + ")");
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("[DeepL] {} error: {} — {}", op, e.getClass().getSimpleName(), e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach the translation service");
        }
    }

    private static void appendParam(StringBuilder form, String key, String value) {
        if (form.length() > 0) {
            form.append('&');
        }
        form.append(URLEncoder.encode(key, StandardCharsets.UTF_8))
                .append('=')
                .append(URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8));
    }
}
