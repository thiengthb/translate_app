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
                You are a strict Japanese translation grader. Compare the learner's sentence to the reference and score SEMANTIC ACCURACY only.

                Reference (model answer, 100%% correct): %s
                Learner's answer: %s
                Target grammar nuance: %s
                Common mistakes:
                %s

                Score on a 0-100 integer scale:
                - 0   = empty, gibberish, or completely unrelated language
                - 20  = a few related words but wrong meaning
                - 50  = roughly the right idea but missing key meaning
                - 75  = correct meaning, somewhat unnatural
                - 90  = correct and natural, minor issues
                - 100 = matches the reference meaning exactly

                Be strict. "hahaha" or random letters = 0. Off-topic Japanese = 0-20.

                Reply with ONLY this JSON, no other text:
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
