# Example-sentence seed (per-kanji "Câu" section)

Generates `src/main/resources/seed/kanji-sentences-seed.json` — example sentences
linked to each kanji on the Kanji-Study detail page, and the corpus for future
fill-in-the-blank questions. Self-contained to Kanji Study: sentences live in
`kanji_sentences` and link to `kanji_details` via `kanji_sentence_links`. The
shared dictionary `words`/`examples` tables are never touched.

## Data source (open, attribution required)

- **[Tatoeba](https://tatoeba.org)** — CC BY 2.0 FR. Japanese sentences plus their
  English and (where available) Vietnamese translations. Vietnamese coverage is
  sparse (~1k of the chosen sentences), so most render in English; see "Vietnamese"
  below.

## What is committed vs generated

- A **small sample** (~20 sentences) is what should live in git so a fresh checkout
  works. The generator **overwrites that same file** with the full corpus (~4–5 MB,
  ~38k sentences). Decide per repo policy whether to commit the full corpus (works on
  any fresh DB, no re-download) or keep the sample committed + the full file local.

## Furigana

Furigana is **not** in the JSON. It is generated on import by `FuriganaService`
(Sudachi) so the stored ruby always matches the running tokenizer. The dictionary
must be present first (`./mvnw process-resources`).

## Run

```bash
cd backend/scripts

# 1. Download + extract Tatoeba per-language sentences + the links file into
#    _kanji_data/ (gitignored). English is ~108 MB, links ~450 MB uncompressed.
for l in jpn eng vie; do
  curl -o _kanji_data/${l}_sentences.tsv.bz2 \
    https://downloads.tatoeba.org/exports/per_language/$l/${l}_sentences.tsv.bz2
  bzip2 -df _kanji_data/${l}_sentences.tsv.bz2
done
curl -o _kanji_data/links.tar.bz2 https://downloads.tatoeba.org/exports/links.tar.bz2
tar -xjf _kanji_data/links.tar.bz2 -C _kanji_data

# 2. Generate the seed (caps 30 sentences/kanji; override with MAX_PER_KANJI).
#    Needs a big heap — the English corpus is large.
node --max-old-space-size=4096 gen-sentence-seed.mjs
#   MAX_PER_KANJI=20 node --max-old-space-size=4096 gen-sentence-seed.mjs

# 3. Load it. On a FRESH/empty table it loads automatically on boot. To REPLACE an
#    existing corpus (clears kanji_sentences + _links, regenerates furigana):
#      POST /api/kanji-details/reimport-sentences   (needs KANJI_DETAIL_UPDATE)
#    (Run ./mvnw process-resources first so the new JSON is on the classpath.)
```

## Scope & ordering

Only sentences containing a kanji that appears in a Kanji-Study **deck**
(`kanji-study-seed.json` → `decks[].characters`) are kept. Shorter sentences are
preferred (better for learners and fill-in-the-blank). With the current decks
(~2,135 kanji) this yields ~38k sentences; ~1,700 kanji reach the 15+ target,
the rest are limited by what Tatoeba actually has.

## Vietnamese

Tatoeba's JA→VI links are sparse, so most sentences are English-only (the UI falls
back to English). For full Vietnamese, run a machine-translation pass (the project
already has a Gemini key) over `translationEn` → `translationVi` — not yet wired up.
