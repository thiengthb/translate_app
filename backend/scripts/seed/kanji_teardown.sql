-- Teardown for the Kanji Study schema change (LOCAL DEV ONLY).
-- Drops the kanji-study tables so Hibernate (ddl-auto=update) recreates them with the new
-- self-contained schema on next backend start, and clears the rows previously seeded into the
-- colleague's `kanjis` table. Run this, restart the backend, then run kanji_n5_seed.sql.
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS kanji_deck_items;
DROP TABLE IF EXISTS kanji_study_sessions;  -- FK → kanji_decks
DROP TABLE IF EXISTS kanji_decks;
DROP TABLE IF EXISTS kanji_readings;
DROP TABLE IF EXISTS kanji_progress;
DROP TABLE IF EXISTS kanji_session_items;
DROP TABLE IF EXISTS kanji_writing_attempts;
DROP TABLE IF EXISTS kanji_stroke_orders;  -- renamed to kanji_radicals
DROP TABLE IF EXISTS kanji_details;

-- Return the colleague's dictionary table to empty (we only ever seeded N5 rows into it).
DELETE FROM kanjis;

SET FOREIGN_KEY_CHECKS = 1;
