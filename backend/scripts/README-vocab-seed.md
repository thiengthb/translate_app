# Vocabulary seed (local dev data)

Seeds the shared `words` table from **JMdict** (English glosses), then links every
word to the Kanji-Study `kanji_details` table via `kanji_detail_words` so the kanji
detail page's vocabulary sections ("Từ vựng", "Từ được đề cử", "Ví dụ phát âm") fill in.

## Data source (open, attribution required)

- **JMdict** — EDRDG / Jim Breen, CC BY-SA → Japanese surface, kana reading, part-of-speech,
  priority tags, and **English** glosses. (JMdict has no JLPT grading, so every word is
  imported at level `KHAC`; the UI hides that badge. JLPT enrichment is a separate pass.)

## Mapping (`gen-vocab-seed.mjs`)

| CSV column | From JMdict |
|---|---|
| Word | first `<keb>` (kanji form), else first `<reb>` (kana) |
| Reading | first `<reb>` (blank when the word is already kana) |
| WordType | first `<pos>` entity name (`n`, `v1`, `adj-i`, …) |
| Frequency | derived from `ke_pri`/`re_pri` (lower = more common; blank = rare) |
| Representation | KANJI / KATAKANA / HIRAGANA / MIXED / general (from the word's script) |
| Level | `KHAC` (no JLPT in JMdict) |
| Meanings | one `en: g1, g2` item per `<sense>`, items joined by ` \| ` |
| Examples | blank (sentences come live from Tatoeba) |

## Run

```bash
# 1. Download JMdict (English) into _kanji_data/ (gitignored, ~10 MB gz)
cd backend/scripts
curl -o _kanji_data/JMdict_e.gz http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz

# 2. Generate the import CSV  ->  seed/words-jmdict.csv  (~217k rows)
node --max-old-space-size=4096 gen-vocab-seed.mjs

# 3. Make sure the catch-all level exists (one-time):
#    POST /api/levels  { "code":"KHAC", "name":"Khac", "isActive":true }

# 4. Import the words (idempotent — re-running skips existing word+reading):
#    POST /api/dictionary/words/import   (multipart "file=@seed/words-jmdict.csv")

# 5. Link words -> kanji (idempotent; also runs automatically on every boot):
#    POST /api/kanji-details/relink-words
```

> The CSV is large (~20 MB) and **not committed** — regenerate it from JMdict with the
> script above. Steps 4 & 5 are idempotent, so the import + relink can be re-run safely.
