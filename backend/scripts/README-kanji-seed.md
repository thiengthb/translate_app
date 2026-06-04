# Kanji Study seed (local dev data)

Seeds the **self-contained** Kanji Study tables so the feature has data locally — it does
**not** touch the colleague's `kanjis` dictionary table.

Tables populated: `kanji_radicals` (214 bộ thủ) → `kanji_details` (79 JLPT N5 kanji, the master
record) → `kanji_readings` (Hán-Việt) → `kanji_decks` + `kanji_deck_items` (built-in N5 deck).

## Data sources (open, attribution required)

- **KANJIDIC2** — EDRDG / Jim Breen, CC BY-SA → character, on/kun, English meaning, stroke, radical number.
- **Unihan `kVietnamese`** — Unicode → Hán-Việt readings (shinjitai → traditional fallback + small override map).
- **`radicals-214.mjs`** — curated 214 Kangxi radicals with Hán-Việt names (committed alongside the generator).

## Run

```bash
# 1. Download + extract sources into backend/scripts/_kanji_data/ (gitignored)
cd backend/scripts && mkdir -p _kanji_data
curl -o _kanji_data/kanjidic2.xml.gz http://www.edrdg.org/kanjidic/kanjidic2.xml.gz
gzip -df _kanji_data/kanjidic2.xml.gz
curl -o _kanji_data/Unihan.zip https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
# extract Unihan_Readings.txt AND Unihan_Variants.txt from the zip into _kanji_data/

# 2. Generate the SQL
node gen-kanji-n5-seed.mjs           # -> seed/kanji_n5_seed.sql

# 3. (Only when the kanji entity schema changed) tear down + let Hibernate recreate
docker exec -i lonthien-mysql mysql -uroot -proot --default-character-set=utf8mb4 \
  translate_app < seed/kanji_teardown.sql
#    ...then restart the backend so ddl-auto=update creates the new tables.

# 4. Load the seed (idempotent — safe to re-run)
docker exec -i lonthien-mysql mysql -uroot -proot --default-character-set=utf8mb4 \
  translate_app < seed/kanji_n5_seed.sql
```

To widen the scope (e.g. N4) edit the `N5` array in `gen-kanji-n5-seed.mjs` and re-run steps 2 & 4.
