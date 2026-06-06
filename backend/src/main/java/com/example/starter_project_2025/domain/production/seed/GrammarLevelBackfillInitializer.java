package com.example.starter_project_2025.domain.production.seed;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * One-shot, idempotent backfill: populates {@code level_id} FK on rows in
 * {@code grammar_sub_uses} and {@code grammars} that were created before the
 * String {@code jlpt_level} column was replaced with the FK relation.
 *
 * <p>Hibernate {@code ddl-auto=update} adds the new {@code level_id} column but
 * never drops the old {@code jlpt_level} column, so existing rows carry the old
 * text value but have {@code level_id = NULL}. This runner joins against the
 * {@code levels} table once per startup to fill the gap.
 *
 * <p>The {@code WHERE level_id IS NULL} guard makes every run idempotent —
 * already-backfilled rows are skipped.
 *
 * <p>On a fresh H2 schema the {@code jlpt_level} column never exists (Hibernate
 * creates the table from the current entity without it), so the queries fail and
 * are swallowed silently via the try/catch.
 */
@Slf4j
@Component
@Order(201)
@RequiredArgsConstructor
public class GrammarLevelBackfillInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            int subUses = jdbc.update(
                    "UPDATE grammar_sub_uses gsu " +
                    "SET gsu.level_id = (" +
                    "  SELECT l.id FROM levels l " +
                    "  WHERE UPPER(l.code) = UPPER(gsu.jlpt_level)" +
                    ") " +
                    "WHERE gsu.level_id IS NULL " +
                    "  AND gsu.jlpt_level IS NOT NULL " +
                    "  AND gsu.jlpt_level != ''");

            int grammars = jdbc.update(
                    "UPDATE grammars g " +
                    "SET g.level_id = (" +
                    "  SELECT l.id FROM levels l " +
                    "  WHERE UPPER(l.code) = UPPER(g.jlpt_level)" +
                    ") " +
                    "WHERE g.level_id IS NULL " +
                    "  AND g.jlpt_level IS NOT NULL " +
                    "  AND g.jlpt_level != ''");

            if (subUses > 0 || grammars > 0) {
                log.info("Grammar level backfill: {} grammar_sub_uses, {} grammars updated",
                        subUses, grammars);
            } else {
                log.debug("Grammar level backfill: nothing to update (already done or fresh schema)");
            }
        } catch (Exception ex) {
            // jlpt_level column absent on fresh H2 schema — nothing to backfill.
            log.debug("Grammar level backfill skipped (jlpt_level column absent): {}", ex.getMessage());
        }
    }
}
