package com.example.starter_project_2025.domain.production.llm;

import com.example.starter_project_2025.domain.production.grammar.model.CommonMistake;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

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
        this.restClient = builder.build();
        this.apiUrl = apiUrl;
        this.model = model;
        this.mapper = mapper;
    }

    private record OllamaRawResponse(String response) {}

    private record OllamaJudgePayload(boolean meaningOk, String feedback) {}

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
                You are grading a Japanese learner's sentence. Reply with ONLY a JSON object, no other text:
                {"meaningOk": <true|false>, "feedback": "<short Vietnamese feedback>"}

                Target grammar nuance: %s
                Reference Japanese sentence: %s
                Learner's answer: %s
                Common mistakes to watch for:
                %s
                meaningOk = true if the learner's answer is semantically close to the reference and natural.
                feedback in Vietnamese, concise and specific.
                """.formatted(safe(nuance), safe(refL2), safe(answer), mistakes.toString());

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
        return JudgeResult.builder()
                .meaningScore(p.meaningOk() ? 0.85 : 0.3)
                .pointUsed(p.meaningOk())
                .grammarOk(p.meaningOk())
                .verdict(p.meaningOk() ? "PASS" : "FAIL")
                .feedback("[AI Offline] " + (p.feedback() == null ? "" : p.feedback()))
                .build();
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
