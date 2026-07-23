// Generate the per-kanji example-sentence seed from Tatoeba bulk exports.
//
// Sources (CC BY 2.0 FR — attribution required), placed in _kanji_data/:
//   jpn_sentences.tsv  id <TAB> lang <TAB> text   (Japanese)
//   eng_sentences.tsv  id <TAB> lang <TAB> text   (English)
//   vie_sentences.tsv  id <TAB> lang <TAB> text   (Vietnamese)
//   links.csv          sentence_id <TAB> translation_id
//   Download + extract:
//     for l in jpn eng vie; do
//       curl -o _kanji_data/${l}_sentences.tsv.bz2 \
//         https://downloads.tatoeba.org/exports/per_language/$l/${l}_sentences.tsv.bz2
//       bzip2 -df _kanji_data/${l}_sentences.tsv.bz2
//     done
//     curl -o _kanji_data/links.tar.bz2 https://downloads.tatoeba.org/exports/links.tar.bz2
//     tar -xjf _kanji_data/links.tar.bz2 -C _kanji_data
//
// Output: seed/kanji-sentences-seed.json  → loaded on boot by KanjiSentenceSeeder,
//   which generates furigana (Sudachi) and links each sentence to the kanji it
//   contains. (Furigana is NOT produced here — it must match the running tokenizer.)
//
// Strategy (memory-safe — never holds the full English corpus in RAM):
//   1. Keep Japanese sentences that contain a TARGET kanji.
//      Target = union of all deck characters in kanji-study-seed.json (fallback:
//      every kanji in that file). Only kanji that exist as kanji_details can be
//      linked, so other sentences are useless.
//   2. From links.csv, map each kept jpn sentence to its translation ids.
//   3. Pull only the needed English / Vietnamese texts.
//   4. Require an English translation (vie is a bonus). Prefer shorter sentences
//      (better for learners + fill-in-the-blank), capped at MAX_PER_KANJI each.

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "_kanji_data");
const JPN = path.join(DATA, "jpn_sentences.tsv");
const ENG = path.join(DATA, "eng_sentences.tsv");
const VIE = path.join(DATA, "vie_sentences.tsv");
const LINKS = path.join(DATA, "links.csv");
const KANJI_SEED = path.join(__dirname, "..", "src", "main", "resources", "seed", "kanji-study-seed.json");
// Write the full corpus to the gitignored ".full.json" classpath location, which
// the import service prefers over the committed sample (kanji-sentences-seed.json).
const OUT = path.join(__dirname, "..", "src", "main", "resources", "seed", "kanji-sentences-seed.full.json");

const MAX_PER_KANJI = Number(process.env.MAX_PER_KANJI || 30);

const isKanji = (cp) =>
  (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0xf900 && cp <= 0xfaff);

function distinctKanji(text) {
  const set = new Set();
  for (const ch of text) if (isKanji(ch.codePointAt(0))) set.add(ch);
  return [...set];
}

function loadTargetKanji() {
  const j = JSON.parse(fs.readFileSync(KANJI_SEED, "utf8"));
  const set = new Set();
  for (const d of j.decks || []) for (const c of d.characters || []) set.add(c);
  if (set.size === 0) for (const k of j.kanji || []) if (k.character) set.add(k.character);
  return set;
}

async function eachLine(file, fn) {
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) fn(line);
}

/** Parse "id <TAB> lang <TAB> text" → [id, text]; null if malformed. */
function parseSentence(line) {
  const t1 = line.indexOf("\t");
  const t2 = line.indexOf("\t", t1 + 1);
  if (t1 < 0 || t2 < 0) return null;
  return [Number(line.slice(0, t1)), line.slice(t2 + 1)];
}

async function main() {
  for (const f of [JPN, ENG, VIE, LINKS, KANJI_SEED]) {
    if (!fs.existsSync(f)) {
      console.error(`Missing input: ${f}\nSee the header of this script for download instructions.`);
      process.exit(1);
    }
  }

  const target = loadTargetKanji();
  console.log(`Target kanji: ${target.size}`);

  // 1. Japanese sentences touching a target kanji.
  const jpn = new Map(); // id -> text
  await eachLine(JPN, (line) => {
    const p = parseSentence(line);
    if (p && distinctKanji(p[1]).some((c) => target.has(c))) jpn.set(p[0], p[1]);
  });
  console.log(`jpn (with target kanji): ${jpn.size}`);

  // 2. links: kept-jpn id -> [translation ids]; collect all needed translation ids.
  const transOf = new Map(); // jpnId -> number[]
  const needed = new Set(); // translation ids we must fetch text for
  await eachLine(LINKS, (line) => {
    const tab = line.indexOf("\t");
    if (tab < 0) return;
    const a = Number(line.slice(0, tab));
    if (!jpn.has(a)) return;
    const b = Number(line.slice(tab + 1));
    let arr = transOf.get(a);
    if (!arr) transOf.set(a, (arr = []));
    arr.push(b);
    needed.add(b);
  });
  console.log(`jpn with >=1 translation link: ${transOf.size}, translation ids needed: ${needed.size}`);

  // 3. Pull only the needed EN / VI texts.
  const eng = new Map();
  await eachLine(ENG, (line) => {
    const p = parseSentence(line);
    if (p && needed.has(p[0])) eng.set(p[0], p[1]);
  });
  const vie = new Map();
  await eachLine(VIE, (line) => {
    const p = parseSentence(line);
    if (p && needed.has(p[0])) vie.set(p[0], p[1]);
  });
  console.log(`resolved eng: ${eng.size}, vie: ${vie.size}`);

  // 4. Candidates: jpn that have at least an English translation.
  const candidates = [];
  for (const [id, text] of jpn) {
    const trans = transOf.get(id);
    if (!trans) continue;
    let en = null, vi = null;
    for (const t of trans) {
      if (en == null && eng.has(t)) en = eng.get(t);
      if (vi == null && vie.has(t)) vi = vie.get(t);
    }
    if (en == null) continue;
    candidates.push({ tatoebaId: id, japanese: text, en, vi, len: [...text].length });
  }
  candidates.sort((a, b) => a.len - b.len || a.tatoebaId - b.tatoebaId);
  console.log(`Candidates with EN translation: ${candidates.length}`);

  // Greedy cap per kanji; keep a sentence if any of its target kanji still has room.
  const perKanji = new Map();
  const chosen = [];
  for (const c of candidates) {
    const chars = distinctKanji(c.japanese).filter((ch) => target.has(ch));
    if (!chars.some((ch) => (perKanji.get(ch) || 0) < MAX_PER_KANJI)) continue;
    chosen.push({ tatoebaId: c.tatoebaId, japanese: c.japanese, en: c.en, vi: c.vi });
    for (const ch of chars) perKanji.set(ch, (perKanji.get(ch) || 0) + 1);
  }

  // Coverage report: how many target kanji reached the desired count.
  let full = 0, some = 0;
  for (const ch of target) {
    const n = perKanji.get(ch) || 0;
    if (n >= 15) full++;
    if (n > 0) some++;
  }

  const out = {
    _comment: `Generated by gen-sentence-seed.mjs from Tatoeba. ${chosen.length} sentences covering ${some}/${target.size} target kanji (${full} with >=15), max ${MAX_PER_KANJI}/kanji. Furigana generated on import by KanjiSentenceSeeder.`,
    source: "Tatoeba",
    sentences: chosen,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0), "utf8");
  console.log(`Wrote ${chosen.length} sentences -> ${OUT}`);
  console.log(`Coverage: ${some}/${target.size} kanji have >=1 sentence; ${full} have >=15.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
