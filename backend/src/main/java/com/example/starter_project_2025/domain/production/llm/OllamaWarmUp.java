package com.example.starter_project_2025.domain.production.llm;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Warms the Ollama model on startup, in a background daemon thread so it never
 * delays boot and never breaks startup when Ollama is offline. With {@code keep_alive}
 * set on every call, this makes the user's first drill fast instead of paying the
 * one-off cold model-load latency.
 */
@Component
@RequiredArgsConstructor
public class OllamaWarmUp {

    private final OllamaClient ollamaClient;

    @EventListener(ApplicationReadyEvent.class)
    public void warmUpOnReady() {
        Thread t = new Thread(ollamaClient::warmUp, "ollama-warmup");
        t.setDaemon(true);
        t.start();
    }
}
