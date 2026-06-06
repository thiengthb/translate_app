package com.example.starter_project_2025.domain.production.seed;

import com.example.starter_project_2025.domain.production.grammar.Grammar;
import com.example.starter_project_2025.domain.production.grammar.GrammarRepository;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * One-time, idempotent backfill: every {@link GrammarSubUse} (a "usage") must hang
 * off a parent {@link Grammar} (the expression) for the learner dictionary. Existing
 * data has one usage per expression, so each unlinked usage gets its own expression
 * (slug = its detector key). Runs after the grammar seeders.
 */
@Slf4j
@Component
@Order(200)
@RequiredArgsConstructor
public class GrammarBackfillInitializer implements CommandLineRunner {

    private final GrammarSubUseRepository subUseRepository;
    private final GrammarRepository grammarRepository;

    @Override
    @Transactional
    public void run(String... args) {
        List<GrammarSubUse> orphans = subUseRepository.findByGrammarIsNull();
        if (orphans.isEmpty()) {
            return;
        }
        int linked = 0;
        for (GrammarSubUse su : orphans) {
            String slug = su.getDetectorKey();
            if (slug == null || slug.isBlank()) {
                continue; // detectorKey is required, but guard anyway
            }
            Grammar grammar = grammarRepository.findBySlug(slug)
                    .orElseGet(() -> grammarRepository.save(Grammar.builder()
                            .slug(slug)
                            .form(su.getName())
                            .level(su.getLevel())
                            .titleGloss(su.getNuanceDescription())
                            .build()));
            su.setGrammar(grammar);
            if (su.getOrderNo() == null) {
                su.setOrderNo(1);
            }
            subUseRepository.save(su);
            linked++;
        }
        log.info("Grammar backfill: linked {} usage(s) to parent expressions", linked);
    }
}
