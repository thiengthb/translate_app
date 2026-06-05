// Generates a local dev SQL + JSON seed for the Kanji Study feature (self-contained — does NOT
// touch the colleague's `kanjis` table). Targets the kanji-study tables:
//   kanji_radicals (214 bộ thủ) → kanji_details (master kanji) → kanji_readings (Hán-Việt)
//   → kanji_decks + kanji_deck_items (one built-in deck per level).
//
// Built-in decks produced (Kyōiku grade kanji):
//   - Cấp độ 1 / Grade 1 (80 kanji,  Kyōiku grade 1)
//   - Cấp độ 2 / Grade 2 (160 kanji, Kyōiku grade 2)
//   - Cấp độ 3 / Grade 3 (200 kanji, Kyōiku grade 3)
// Grades are disjoint, so each kanji belongs to exactly one deck.
//
// Sources (open data, attribution in the generated SQL header):
//   - KANJIDIC2 (EDRDG / Jim Breen, CC BY-SA): char, on/kun, meaning(EN), stroke, radical number
//   - Unihan kVietnamese (Unicode): Hán-Việt readings
//   - radicals-214.mjs: curated 214 Kangxi radicals with Hán-Việt names
//
// Usage:  node backend/scripts/gen-kanji-n5-seed.mjs   (needs _kanji_data/, see README)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RADICALS, radicalStrokeCount } from "./radicals-214.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "_kanji_data");
const OUT_DIR = path.join(__dirname, "seed");
const OUT = path.join(OUT_DIR, "kanji_seed.sql");

// ── Level definitions ───────────────────────────────────────────────────────
// `level` is stored in kanji_details.jlpt_level / kanji_decks.jlpt_level (≤ 8 chars)
// and is what the dashboard groups by. Order here = order the kanji appear in the deck.
const LEVELS = [
  {
    level: "SC1",
    title: "Sơ cấp 1",
    description: "80 Hán tự lớp 1 (Kyōiku — Grade 1).",
    chars: [...
      "一二三四五六七八九十百千上下左右中大小月日年早木林山川土空田天生花草虫犬人名女男子目耳口手足見音力気円入出立休先夕本文字学校村町森正水火玉王石竹糸貝車金雨赤青白"],
  },
  {
    level: "SC2",
    title: "Sơ cấp 2",
    description: "160 Hán tự lớp 2 (Kyōiku — Grade 2).",
    chars: [...
      "数多少万半形太細広長点丸交光角計直線矢弱強高同親母父姉兄弟妹自友体毛頭顔首心時曜朝昼夜分週春夏秋冬今新古間方北南東西遠近前後内外場地国園谷野原里市京風雪雲池海岩星室戸家寺通門道話言答声聞語読書記紙画絵図工教晴思考知才理算作元食肉馬牛魚鳥羽鳴麦米茶色黄黒来行帰歩走止活店買売午汽弓回会組船明社切電毎合当台楽公引科歌刀番用何"],
  },
  {
    level: "SC3",
    title: "Sơ cấp 3",
    description: "200 Hán tự lớp 3 (Kyōiku — Grade 3).",
    chars: [...
      "丁世両主乗予事仕他代住使係倍全具写列助勉動勝化区医去反取受号向君味命和品員商問坂央始委守安定実客宮宿寒対局屋岸島州帳平幸度庫庭式役待急息悪悲想意感所打投拾持指放整旅族昔昭暑暗曲有服期板柱根植業様横橋次歯死氷決油波注泳洋流消深温港湖湯漢炭物球由申界畑病発登皮皿相県真着短研礼神祭福秒究章童笛第筆等箱級終緑練羊美習者育苦荷落葉薬血表詩調談豆負起路身転軽農返追送速進遊運部都配酒重鉄銀開院陽階集面題飲館駅鼻"],
  },
  {
    level: "SC4",
    title: "Sơ cấp 4",
    description: "Hán tự lớp 4 (Kyōiku — Grade 4).",
    chars: [...
      "不争付令以仲伝位低例便信倉候借停健側働億兆児共兵典冷初別利刷副功加努労勇包卒協単博印参史司各告周唱喜器囲固型堂塩士変夫失好季孫完官害察巣差希席帯底府康建径徒得必念愛成戦折挙改救敗散料旗昨景最望未末札材束松果栄案梅械極標機欠歴残殺毒氏民求治法泣浅浴清満漁灯無然焼照熱牧特産的省祝票種積競笑管節粉紀約結給続置老胃脈腸臣航良芸芽英菜街衣要覚観訓試説課議象貨貯費賞軍輪辞辺連達選郡量録鏡関陸隊静順願類飛飯養験"],
  },
  {
    level: "SC5",
    title: "Sơ cấp 5",
    description: "Hán tự lớp 5 (Kyōiku — Grade 5).",
    chars: [...
      "仏仮件任似余価保修俵個備像再刊判制券則効務勢厚句可営因団圧在均基報境墓増夢妻婦容寄富導居属布師常幹序弁張往復徳志応快性恩情態慣承技招授採接提損支政故敵断旧易暴条枝査格桜検構武比永河液混減測準演潔災燃版犯状独率現留略益眼破確示祖禁移程税築精素経統絶綿総編績織罪群義耕職肥能興舌舎術衛製複規解設許証評講謝識護豊財貧責貸貿賀資賛質輸述迷退逆造過適酸鉱銅銭防限険際雑非預領額飼"],
  },
  {
    level: "SC6",
    title: "Sơ cấp 6",
    description: "Hán tự lớp 6 (Kyōiku — Grade 6).",
    chars: [...
      "並乱乳亡仁供俳値傷優党冊処刻割創劇勤危卵厳収后否吸呼善困垂城域奏奮姿存孝宅宇宗宙宝宣密寸専射将尊就尺届展層己巻幕干幼庁座延律従忘忠憲我批担拝拡捨探推揮操敬映晩暖暮朗机枚染株棒模権樹欲段沿泉洗派済源潮激灰熟片班異疑痛皇盛盟看砂磁私秘穀穴窓筋策簡糖系紅納純絹縦縮署翌聖肺背胸脳腹臓臨至若著蒸蔵蚕衆裁装裏補視覧討訪訳詞誌認誕誠誤論諸警貴賃遺郵郷針鋼閉閣降陛除障難革頂骨"],
  },
  {
    level: "TC1",
    title: "Trung cấp 1",
    description: "Hán tự THCS (Jōyō — trung học, phần 1).",
    chars: [...
      "握扱依威為偉違維緯壱芋陰隠影鋭越援煙鉛縁汚押奥憶菓暇箇雅介戒皆壊較獲刈甘汗乾勧歓監環鑑含奇祈鬼幾輝儀戯詰却脚及丘朽巨拠距御凶叫狂況狭恐響驚仰駆屈掘繰恵傾継迎撃肩兼剣軒圏堅遣玄枯誇鼓互抗攻更恒荒香項稿豪込婚鎖彩歳載剤咲惨旨伺刺脂紫雌執芝斜煮釈寂朱狩趣需舟秀襲柔獣瞬旬巡盾召床沼称紹詳丈畳殖飾触侵振浸寝慎震薪尽陣尋吹是井姓征跡占扇鮮訴僧燥騒贈即俗耐替沢拓濁脱丹淡嘆端弾恥致遅蓄沖跳徴澄沈珍抵堤摘滴添殿吐途渡奴怒到逃倒唐桃透盗塔稲踏闘胴峠突鈍曇弐悩濃杯輩拍泊迫薄爆髪抜罰般販搬範繁盤彼疲被避尾微匹描浜敏怖浮普腐敷膚賦舞幅払噴柄壁捕舗抱峰砲忙坊肪冒傍帽凡盆慢漫妙眠矛霧娘茂猛網黙紋躍雄与誉溶腰踊謡翼雷頼絡欄離粒慮療隣涙隷齢麗暦劣烈恋露郎惑腕"],
  },
  {
    level: "TC2",
    title: "Trung cấp 2",
    description: "Hán tự THCS (Jōyō — trung học, phần 2).",
    chars: [...
      "哀慰詠悦閲炎宴欧殴乙卸穏佳架華嫁餓怪悔塊慨該概郭隔穫岳掛滑肝冠勘貫喚換敢緩企岐忌軌既棋棄騎欺犠菊吉喫虐虚峡脅凝斤緊愚偶遇刑契啓掲携憩鶏鯨倹賢幻孤弧雇顧娯悟孔巧甲坑拘郊控慌硬絞綱酵克獄恨紺魂墾債催削搾錯撮擦暫祉施諮侍慈軸疾湿赦邪殊寿潤遵如徐匠昇掌晶焦衝鐘冗嬢錠譲嘱辱伸辛審炊粋衰酔遂穂随髄瀬牲婿請斥隻惜籍摂潜繕阻措粗礎双桑掃葬遭憎促賊怠胎袋逮滞滝択卓託諾奪胆鍛壇稚畜窒抽鋳駐彫超聴陳鎮墜帝訂締哲斗塗凍陶痘匿篤豚尿粘婆排陪縛伐帆伴畔藩蛮卑碑泌姫漂苗赴符封伏覆紛墳癖募慕簿芳邦奉胞倣崩飽縫乏妨房某膨謀墨没翻魔埋膜又魅滅免幽誘憂揚揺擁抑裸濫吏隆了猟陵糧厘励零霊裂廉錬炉浪廊楼漏湾"],
  },
  {
    level: "TC3",
    title: "Trung cấp 3",
    description: "Hán tự THCS (Jōyō — trung học, phần 3).",
    chars: [...
      "亜尉逸姻韻疫謁猿凹翁虞渦禍靴寡稼蚊拐懐劾涯垣核殻嚇潟括喝渇褐轄且缶陥患堪棺款閑寛憾還艦頑飢宜偽擬糾窮拒享挟恭矯暁菌琴謹襟吟隅勲薫茎渓蛍慶傑嫌献謙繭顕懸弦呉碁江肯侯洪貢溝衡購拷剛酷昆懇佐唆詐砕宰栽斎崎索酢桟傘肢嗣賜滋璽漆遮蛇酌爵珠儒囚臭愁酬醜汁充渋銃叔淑粛塾俊准殉循庶緒叙升抄肖尚宵症祥渉訟硝粧詔奨彰償礁浄剰縄壌醸津唇娠紳診刃迅甚帥睡枢崇据杉畝斉逝誓析拙窃仙栓旋践遷薦繊禅漸租疎塑壮荘捜挿曹喪槽霜藻妥堕惰駄泰濯但棚痴逐秩嫡衷弔挑眺釣懲勅朕塚漬坪呈廷邸亭貞逓偵艇泥迭徹撤悼搭棟筒謄騰洞督凸屯軟尼妊忍寧把覇廃培媒賠伯舶漠肌鉢閥煩頒妃披扉罷猫賓頻瓶扶附譜侮沸雰憤丙併塀幣弊偏遍浦泡俸褒剖紡朴僕撲堀奔麻摩磨抹岬銘妄盲耗厄愉諭癒唯悠猶裕融庸窯羅酪痢履柳竜硫虜涼僚寮倫累塁戻鈴賄枠"],
  },
  {
    level: "NC",
    title: "Nâng cao",
    description: "Hán tự Jōyō nâng cao (phần còn lại).",
    chars: [...
      "挨曖宛嵐畏萎椅彙茨咽淫唄鬱怨媛艶旺岡臆俺苛牙瓦楷潰諧崖蓋骸柿顎葛釜鎌韓玩伎亀毀畿臼嗅巾僅錦惧串窟熊詣憬稽隙桁拳鍵舷股虎錮勾梗喉乞傲駒頃痕沙挫采塞埼柵刹拶斬恣摯餌鹿叱嫉腫呪袖羞蹴憧拭尻芯腎須裾凄醒脊戚煎羨腺詮箋膳狙遡曽爽痩踪捉遜汰唾堆戴誰旦綻緻酎貼嘲捗椎爪鶴諦溺填妬賭藤瞳栃頓貪丼那奈梨謎鍋匂虹捻罵剥箸氾汎阪斑眉膝肘阜訃蔽餅璧蔑哺蜂貌頬睦勃昧枕蜜冥麺冶弥闇喩湧妖瘍沃拉辣藍璃慄侶瞭瑠呂賂弄籠麓脇"],
  },
];

// Each unique character, in stable first-seen order, with the level it was first
// introduced at (used for kanji_details.jlpt_level). Levels are disjoint (Jōyō
// partition), so first-seen = the kanji's level.
const charLevel = new Map();
for (const lv of LEVELS) {
  for (const ch of lv.chars) if (!charLevel.has(ch)) charLevel.set(ch, lv.level);
}
const ALL_CHARS = [...charLevel.keys()];
const ALL_SET = new Set(ALL_CHARS);

// ── XML helpers ────────────────────────────────────────────────────────────
const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const allMatch = (block, re) => [...block.matchAll(re)].map((m) => decode(m[1].trim()));

// ── Parse KANJIDIC2 ────────────────────────────────────────────────────────
const xml = fs.readFileSync(path.join(DATA, "kanjidic2.xml"), "utf8");
const kanji = new Map(); // char -> {onyomi, kunyomi, meaning, stroke, radicalNumber}

for (const b of xml.split("</character>")) {
  const lit = b.match(/<literal>(.*?)<\/literal>/);
  if (!lit || !ALL_SET.has(lit[1])) continue;
  const onyomi = allMatch(b, /<reading r_type="ja_on">(.*?)<\/reading>/g);
  const kunyomi = allMatch(b, /<reading r_type="ja_kun">(.*?)<\/reading>/g);
  const meaning = allMatch(b, /<meaning>([^<]*)<\/meaning>/g); // no m_lang attr = English
  const stroke = b.match(/<stroke_count>(\d+)<\/stroke_count>/);
  const radNum = b.match(/<rad_value rad_type="classical">(\d+)<\/rad_value>/);
  kanji.set(lit[1], {
    onyomi: onyomi.join("、") || null,
    kunyomi: kunyomi.join("、") || null,
    meaning: meaning.join("; ") || null,
    stroke: stroke ? Number(stroke[1]) : null,
    radicalNumber: radNum ? Number(radNum[1]) : null,
  });
}

// ── Parse Unihan kVietnamese (with shinjitai → traditional fallback) ───────
const cpToChar = (cp) => String.fromCodePoint(parseInt(cp.slice(2), 16));

const kViet = new Map();
for (const line of fs.readFileSync(path.join(DATA, "Unihan_Readings.txt"), "utf8").split("\n")) {
  if (!line.startsWith("U+")) continue;
  const [cp, field, val] = line.split("\t");
  if (field === "kVietnamese") kViet.set(cpToChar(cp), val.trim().split(/\s+/));
}
const tradOf = new Map();
for (const line of fs.readFileSync(path.join(DATA, "Unihan_Variants.txt"), "utf8").split("\n")) {
  if (!line.startsWith("U+")) continue;
  const [cp, field, val] = line.split("\t");
  if (field === "kTraditionalVariant")
    tradOf.set(cpToChar(cp), val.trim().split(/\s+/).map((t) => cpToChar(t.split("<")[0])));
}
const HAN_VIET_OVERRIDE = {
  "北": ["bắc"], "雨": ["vũ"], "父": ["phụ"], "電": ["điện"], "聞": ["văn"],
  "食": ["thực", "tự"], "何": ["hà"], "毎": ["mỗi"], "読": ["độc", "đậu"],
  "円": ["viên"], "気": ["khí"],
};
const hanViet = new Map();
for (const ch of ALL_SET) {
  let reads = kViet.get(ch);
  if (!reads) for (const t of tradOf.get(ch) || []) { if (kViet.get(t)) { reads = kViet.get(t); break; } }
  if (!reads) reads = HAN_VIET_OVERRIDE[ch];
  if (reads) hanViet.set(ch, reads);
}

// ── KanjiVG: stroke order + component (chiết tự) tree ───────────────────────
// Downloads one SVG per kanji (cached in _kanji_data/kanjivg/), then parses it into a
// compact JSON: { v: viewBox, strokes: [d...], tree: {element, position, ..., children} }.
// `strokes` is ordered by KanjiVG stroke id (sN); each tree node carries the stroke indices
// in its subtree so the UI can highlight a component's strokes.
// Source: KanjiVG (Ulrich Apel et al.), CC BY-SA 3.0.
const KVG_DIR = path.join(DATA, "kanjivg");
const KVG_CDN = "https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji";
const toHex5 = (ch) => ch.codePointAt(0).toString(16).padStart(5, "0");

async function fetchSvg(ch) {
  const hex = toHex5(ch);
  const cached = path.join(KVG_DIR, `${hex}.svg`);
  if (fs.existsSync(cached)) return fs.readFileSync(cached, "utf8");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${KVG_CDN}/${hex}.svg`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      fs.mkdirSync(KVG_DIR, { recursive: true });
      fs.writeFileSync(cached, text, "utf8");
      return text;
    } catch (e) {
      if (attempt === 1) { console.warn(`  kanjivg fetch failed ${ch} (${hex}): ${e.message}`); return null; }
    }
  }
  return null;
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`kvg:${name}="([^"]*)"`));
  return m ? m[1] : undefined;
};

// Parse a KanjiVG SVG into { v, strokes, tree } via a tag-stream stack walk.
function parseKvg(svg) {
  const vb = svg.match(/viewBox="([^"]*)"/);
  const viewBox = vb ? vb[1] : "0 0 109 109";
  // Limit to the StrokePaths group (ignore the StrokeNumbers labels).
  const startMatch = svg.match(/<g[^>]*id="kvg:StrokePaths/);
  if (!startMatch) return null;
  const region = svg.slice(startMatch.index);

  const strokes = [];
  const root = { children: [] };
  const stack = [root];          // frame stack (mix of element nodes + plain wrappers)
  const elemStack = [];          // nodes that have a kvg:element (for stroke bubbling)

  const re = /<(\/?)(g|path)\b([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(region))) {
    const [, close, tagName, body] = m;
    if (tagName === "g") {
      if (close) {
        if (stack.length <= 1) continue; // never pop the root
        const frame = stack.pop();
        if (frame && frame.__isElement) elemStack.pop();
        continue;
      }
      const element = attr(body, "element");
      if (element) {
        const node = {
          element,
          original: attr(body, "original"),
          position: attr(body, "position"),
          radical: attr(body, "radical"),
          phon: attr(body, "phon"),
          children: [],
          strokes: [],
          __isElement: true,
        };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
        elemStack.push(node);
      } else {
        stack.push({ children: stack[stack.length - 1].children, __passthrough: true });
      }
    } else if (tagName === "path") {
      const id = body.match(/id="([^"]*)"/);
      if (!id || !/-s\d+$/.test(id[1])) continue;
      const d = body.match(/\sd="([^"]*)"/);
      if (!d) continue;
      const idx = strokes.length;
      strokes.push(d[1]);
      for (const e of elemStack) e.strokes.push(idx); // bubble to all ancestors
    }
  }

  const tree = root.children[0] || null;
  // Drop internal flags + empty fields to keep the JSON compact.
  const clean = (n) => {
    if (!n) return null;
    const o = { element: n.element };
    if (n.original) o.original = n.original;
    if (n.position) o.position = n.position;
    if (n.radical) o.radical = n.radical;
    if (n.phon) o.phon = n.phon;
    if (n.strokes.length) o.strokes = n.strokes;
    const kids = n.children.map(clean).filter(Boolean);
    if (kids.length) o.children = kids;
    return o;
  };
  return { v: viewBox, strokes, tree: clean(tree) };
}

// Bounded-concurrency download + parse for all chars.
const strokeMap = new Map(); // char -> { v, strokes, tree }
{
  const queue = [...ALL_CHARS];
  let ok = 0, fail = 0;
  const worker = async () => {
    while (queue.length) {
      const ch = queue.shift();
      const svg = await fetchSvg(ch);
      if (!svg) { fail++; continue; }
      const parsed = parseKvg(svg);
      if (parsed && parsed.strokes.length) { strokeMap.set(ch, parsed); ok++; }
      else fail++;
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`  kanjivg    : ${ok}/${ALL_CHARS.length} parsed (${fail} missing)`);
}

// ── Emit SQL ───────────────────────────────────────────────────────────────
const q = (v) => (v == null ? "NULL" : "'" + String(v).replace(/'/g, "''") + "'");
const L = [];
L.push("-- Kanji Study seed (LOCAL DEV DATA — self-contained, does NOT touch the `kanjis` table).");
L.push("-- Generated by backend/scripts/gen-kanji-n5-seed.mjs");
L.push("-- Data: KANJIDIC2 (EDRDG, CC BY-SA) + Unihan kVietnamese (Unicode) + curated 214 radicals.");
L.push("-- Idempotent: safe to run multiple times. Run AFTER the backend has created the new schema.");
L.push("SET NAMES utf8mb4;");
L.push("");

// 1. Radicals (bộ thủ)
L.push("-- ── 214 Kangxi radicals (bộ thủ) ──");
RADICALS.forEach(([char, hv, mean], i) => {
  const number = i + 1;
  L.push(
    `INSERT IGNORE INTO kanji_radicals (number, radical_char, han_viet, meaning, stroke_count, is_active, is_deleted, version, created_at, updated_at) ` +
    `VALUES (${number}, ${q(char)}, ${q(hv)}, ${q(mean)}, ${radicalStrokeCount(number) ?? "NULL"}, b'1', b'0', 0, NOW(6), NOW(6));`
  );
});
L.push("");

// 2. Kanji master records (one row per unique char; jlpt_level = first-introduced level)
L.push(`-- ── ${ALL_CHARS.length} kanji (kanji_details = master record) ──`);
const missing = [];
for (const ch of ALL_CHARS) {
  const k = kanji.get(ch);
  if (!k) { missing.push(ch); continue; }
  const radSub = k.radicalNumber != null
    ? `(SELECT id FROM kanji_radicals WHERE number = ${k.radicalNumber} LIMIT 1)`
    : "NULL";
  L.push(
    `INSERT IGNORE INTO kanji_details (kanji_char, onyomi, kunyomi, meaning, jlpt_level, stroke_count, radical_id, is_active, is_deleted, version, created_at, updated_at) ` +
    `SELECT ${q(ch)}, ${q(k.onyomi)}, ${q(k.kunyomi)}, ${q(k.meaning)}, ${q(charLevel.get(ch))}, ${k.stroke ?? "NULL"}, ${radSub}, b'1', b'0', 0, NOW(6), NOW(6) FROM DUAL;`
  );
}
L.push("");

// 3. Hán-Việt readings (FK → kanji_details)
L.push("-- ── Hán-Việt readings (HAN_VIET) ──");
for (const ch of ALL_CHARS) {
  const reads = hanViet.get(ch);
  if (!reads || !kanji.get(ch)) continue;
  reads.forEach((r, i) => {
    L.push(
      `INSERT INTO kanji_readings (kanji_id, reading_type, value, priority, is_active, is_deleted, version, created_at, updated_at) ` +
      `SELECT k.id, 'HAN_VIET', ${q(r)}, ${i}, b'1', b'0', 0, NOW(6), NOW(6) FROM kanji_details k ` +
      `WHERE k.kanji_char = ${q(ch)} AND NOT EXISTS (SELECT 1 FROM kanji_readings r WHERE r.kanji_id = k.id AND r.reading_type = 'HAN_VIET' AND r.value = ${q(r)});`
    );
  });
}
L.push("");

// 3b. KanjiVG stroke order + chiết tự tree (UPDATE so it backfills existing rows too).
L.push("-- ── KanjiVG stroke order + component (chiết tự) tree ──");
for (const ch of ALL_CHARS) {
  const sd = strokeMap.get(ch);
  if (!sd) continue;
  L.push(
    `UPDATE kanji_details SET stroke_data = ${q(JSON.stringify(sd))}, svg_viewbox = ${q(sd.v)}, stroke_source = 'kanjivg' ` +
    `WHERE kanji_char = ${q(ch)};`
  );
}
L.push("");

// 4. One built-in system deck per level + its items (FK → kanji_details)
for (const lv of LEVELS) {
  const present = lv.chars.filter((ch) => kanji.get(ch));
  L.push(`-- ── Built-in ${lv.title} (${present.length} kanji) ──`);
  L.push(
    `INSERT INTO kanji_decks (user_id, title, description, visibility, is_system, jlpt_level, total_kanji, is_active, is_deleted, version, created_at, updated_at) ` +
    `SELECT NULL, ${q(lv.title)}, ${q(lv.description)}, 'PUBLIC', b'1', ${q(lv.level)}, ${present.length}, b'1', b'0', 0, NOW(6), NOW(6) FROM DUAL ` +
    `WHERE NOT EXISTS (SELECT 1 FROM kanji_decks WHERE title = ${q(lv.title)} AND is_system = b'1');`
  );
  present.forEach((ch, idx) => {
    L.push(
      `INSERT IGNORE INTO kanji_deck_items (deck_id, kanji_id, order_index, is_active, is_deleted, version, created_at, updated_at) ` +
      `SELECT d.id, k.id, ${idx}, b'1', b'0', 0, NOW(6), NOW(6) ` +
      `FROM (SELECT id FROM kanji_decks WHERE title = ${q(lv.title)} AND is_system = b'1' LIMIT 1) d ` +
      `JOIN kanji_details k ON k.kanji_char = ${q(ch)} ` +
      `WHERE NOT EXISTS (SELECT 1 FROM kanji_deck_items i WHERE i.deck_id = d.id AND i.kanji_id = k.id);`
    );
  });
  L.push("");
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, L.join("\n") + "\n", "utf8");

// ── Also emit a JSON resource consumed by the Java CommandLineRunner seeder ──
// (survives backend restarts even if ddl-auto recreates the tables).
const jsonOut = path.join(__dirname, "..", "src", "main", "resources", "seed", "kanji-study-seed.json");
const data = {
  radicals: RADICALS.map(([character, hv, meaning], i) => ({
    number: i + 1, character, hanViet: hv, meaning, strokeCount: radicalStrokeCount(i + 1),
  })),
  kanji: ALL_CHARS.filter((ch) => kanji.get(ch)).map((ch) => {
    const k = kanji.get(ch);
    const sd = strokeMap.get(ch);
    return {
      character: ch,
      onyomi: k.onyomi, kunyomi: k.kunyomi, meaning: k.meaning,
      jlptLevel: charLevel.get(ch), strokeCount: k.stroke, radicalNumber: k.radicalNumber,
      hanViet: hanViet.get(ch) || [],
      // KanjiVG payload stored as a JSON string in kanji_details.stroke_data.
      strokeData: sd ? JSON.stringify(sd) : null,
      svgViewbox: sd ? sd.v : null,
      strokeSource: sd ? "kanjivg" : null,
    };
  }),
  decks: LEVELS.map((lv) => ({
    title: lv.title,
    description: lv.description,
    level: lv.level,
    isSystem: true,
    characters: lv.chars.filter((ch) => kanji.get(ch)),
  })),
};
fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
fs.writeFileSync(jsonOut, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`Wrote ${OUT}`);
console.log(`Wrote ${jsonOut}`);
console.log(`  radicals   : ${RADICALS.length}`);
console.log(`  kanji      : ${kanji.size}/${ALL_CHARS.length} unique`);
console.log(`  han-viet   : ${hanViet.size} kanji have readings`);
for (const lv of LEVELS) {
  const present = lv.chars.filter((ch) => kanji.get(ch)).length;
  console.log(`  deck ${lv.level.padEnd(3)}: ${present}/${lv.chars.length}`);
}
const noRad = ALL_CHARS.filter((c) => kanji.get(c) && kanji.get(c).radicalNumber == null);
if (missing.length) console.log(`  MISSING in KANJIDIC2: ${missing.join(" ")}`);
if (noRad.length) console.log(`  no radical: ${noRad.join(" ")}`);
