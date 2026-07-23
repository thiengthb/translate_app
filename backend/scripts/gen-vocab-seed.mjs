// Generate a word-import CSV from JMdict (EDRDG, CC BY-SA) in the format the
// vocabulary importer expects (see WordDataIoService template).
//
// Source: _kanji_data/JMdict_e.gz  (English edition — glosses are English).
//   curl -o _kanji_data/JMdict_e.gz http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
//
// Output: seed/words-jmdict.csv  → import via POST /api/dictionary/words/import,
//   then POST /api/kanji-details/relink-words to link words to kanji.
//
// Mapping (one Word per JMdict entry):
//   Word         = first <keb> (kanji form) or, if none, first <reb> (kana).
//   Reading      = first <reb>, blank when the word is already kana.
//   WordType     = first <pos> entity name (n, v1, adj-i, exp, …).
//   Frequency    = derived from ke_pri/re_pri tags (lower = more common; blank = rare).
//   Representation = KANJI / KATAKANA / HIRAGANA / MIXED / general from the word's script.
//   Level        = KHAC (JMdict has no JLPT grading; the UI hides this badge).
//   Meanings     = one "en: g1, g2" item per <sense>, items separated by " | ".
//   Examples     = blank (sentences come live from Tatoeba).

import fs from "fs";
import zlib from "zlib";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "_kanji_data", "JMdict_e.gz");
const OUT = path.join(__dirname, "seed", "words-jmdict.csv");

const HEADERS = ["Word", "Reading", "WordType", "Frequency", "Representation", "Level", "Meanings", "Examples"];

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const csvLine = (arr) => arr.map(csvCell).join(",");

function unesc(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const code = (ch) => ch.codePointAt(0);
const isKanji = (ch) => { const c = code(ch); return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf) || (c >= 0xf900 && c <= 0xfaff); };
const isHira  = (ch) => { const c = code(ch); return c >= 0x3040 && c <= 0x309f; };
const isKata  = (ch) => { const c = code(ch); return (c >= 0x30a0 && c <= 0x30ff) || (c >= 0x31f0 && c <= 0x31ff); };

function representation(word) {
  let k = false, h = false, ka = false;
  for (const ch of word) { if (isKanji(ch)) k = true; else if (isHira(ch)) h = true; else if (isKata(ch)) ka = true; }
  if (k) return "KANJI";
  if (ka && !h) return "KATAKANA";
  if (h && !ka) return "HIRAGANA";
  if (h || ka) return "MIXED";
  return "general";
}

function freqFromPriority(pris) {
  let best = Infinity;
  for (const p of pris) {
    let v;
    if (/^(news1|ichi1|spec1|gai1)$/.test(p)) v = 1000;
    else if (/^(news2|ichi2|spec2|gai2)$/.test(p)) v = 5000;
    else { const nf = /^nf(\d+)$/.exec(p); v = nf ? parseInt(nf[1], 10) * 500 : 900000; }
    if (v < best) best = v;
  }
  return best === Infinity ? "" : String(best);
}

if (!fs.existsSync(SRC)) {
  console.error(`Missing ${SRC}\nDownload it first:\n  curl -o _kanji_data/JMdict_e.gz http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz`);
  process.exit(1);
}

console.log("Reading + gunzipping JMdict_e.gz …");
const xml = zlib.gunzipSync(fs.readFileSync(SRC)).toString("utf8");

const reEntry = /<entry>([\s\S]*?)<\/entry>/g;
const reKeb   = /<keb>([\s\S]*?)<\/keb>/;
const reReb   = /<reb>([\s\S]*?)<\/reb>/;
const reKePri = /<ke_pri>([\s\S]*?)<\/ke_pri>/g;
const reRePri = /<re_pri>([\s\S]*?)<\/re_pri>/g;
const reSense = /<sense>([\s\S]*?)<\/sense>/g;
const rePos   = /<pos>&([a-z0-9-]+);<\/pos>/;
const reGloss = /<gloss(?:\s[^>]*)?>([\s\S]*?)<\/gloss>/g;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const out = fs.createWriteStream(OUT, { encoding: "utf8" });
out.write("﻿");                       // BOM so Excel reads UTF-8
out.write(csvLine(HEADERS) + "\r\n");

let count = 0, skipped = 0, m;
while ((m = reEntry.exec(xml))) {
  const body = m[1];
  const kebM = reKeb.exec(body);
  const rebM = reReb.exec(body);
  const keb = kebM ? unesc(kebM[1]).trim() : "";
  const reb = rebM ? unesc(rebM[1]).trim() : "";
  const word = keb || reb;
  if (!word) { skipped++; continue; }
  const reading = keb ? reb : "";          // kana word → blank reading

  const pris = [];
  let pm;
  reKePri.lastIndex = 0; while ((pm = reKePri.exec(body))) pris.push(pm[1]);
  reRePri.lastIndex = 0; while ((pm = reRePri.exec(body))) pris.push(pm[1]);

  let wordType = "";
  const meanings = [];
  let sm;
  reSense.lastIndex = 0;
  while ((sm = reSense.exec(body))) {
    const sbody = sm[1];
    if (!wordType) { const p = rePos.exec(sbody); if (p) wordType = p[1]; }
    const glosses = [];
    let gm;
    reGloss.lastIndex = 0;
    while ((gm = reGloss.exec(sbody))) {
      // strip '|' so it can't be read as a meaning-item separator on import
      glosses.push(unesc(gm[1]).trim().replace(/\|/g, "/"));
    }
    if (glosses.length) meanings.push("en: " + glosses.join(", "));
  }
  if (!meanings.length) { skipped++; continue; }

  out.write(csvLine([
    word, reading, wordType, freqFromPriority(pris),
    representation(word), "KHAC", meanings.join(" | "), "",
  ]) + "\r\n");
  count++;
}
out.end(() => console.log(`Done → ${OUT}\n  words: ${count}   skipped (no word/meaning): ${skipped}`));
