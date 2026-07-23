/* =====================================================================
   Hanabun showcase — content model.
   Everything the landing page says about the product lives here, derived
   from the app's real features (routes, @ResourceMenu icons) and the
   Sakura study dashboard. Keeps copy + numbers in one place.
   ===================================================================== */

export const brand = {
  name: "Hanabun",
  glyph: "花",
  tagline: "học tiếng Nhật", // "learn Japanese" — the app's own voice
  blurb:
    "A gamified way to learn Japanese — kanji and vocabulary decks, spaced-repetition grammar, JLPT quizzes and classroom tools, all wrapped in a daily-streak sakura world.",
  startHref: "/register",
  signInHref: "/login",
} as const;

/** Accent tones — all sakura-family, echoing the dashboard chart palette. */
export type Tone = "pink" | "rose" | "mint" | "honey" | "plum";

export interface Feature {
  icon: string; // lucide-react component name, mapped in Features.tsx
  title: string;
  ja: string; // small Japanese label
  blurb: string;
  href: string;
  tone: Tone;
  span: 2 | 3; // desktop bento width (out of a 6-col grid)
  tag?: string; // optional badge, e.g. "SRS", "AI"
}

/** The learner-facing features, ordered for a balanced bento (rows of 6). */
export const features: Feature[] = [
  {
    icon: "PenLine",
    title: "Kanji Study",
    ja: "漢字",
    blurb:
      "Learn kanji by deck and lock them in with spaced repetition, tracking a 7-day forecast toward the 2000-kanji goal.",
    href: "/kanji-study",
    tone: "pink",
    span: 3,
    tag: "SRS",
  },
  {
    icon: "Layers",
    title: "Flashcard Decks",
    ja: "単語帳",
    blurb:
      "Build personal decks and study one card set five ways — Flashcard, Learn, Match, Write and SRS Review.",
    href: "/library",
    tone: "rose",
    span: 3,
    tag: "5 modes",
  },
  {
    icon: "BookOpen",
    title: "Dictionary",
    ja: "辞書",
    blurb:
      "Look up any word by kanji, kana, romaji or meaning — with furigana, stroke order, handwriting and voice input.",
    href: "/dictionary",
    tone: "mint",
    span: 2,
  },
  {
    icon: "GraduationCap",
    title: "Grammar Path",
    ja: "文法",
    blurb:
      "A structured grammar journey with daily goals and review sessions that remember every pattern you meet.",
    href: "/grammar",
    tone: "honey",
    span: 2,
    tag: "SRS",
  },
  {
    icon: "ClipboardList",
    title: "JLPT Quizzes",
    ja: "試験",
    blurb:
      "Timed, graded quizzes from N5 to N1, backed by a rich question bank, with scoring and per-learner progress.",
    href: "/quizzes",
    tone: "pink",
    span: 2,
  },
  {
    icon: "Gamepad2",
    title: "Radical Karuta",
    ja: "部首",
    blurb:
      "A roguelike card game: pick the radicals that build a kanji, chain combos for multipliers and collect omamori buffs.",
    href: "/kanji-radical",
    tone: "rose",
    span: 3,
    tag: "Game",
  },
  {
    icon: "PenTool",
    title: "Sentence Practice",
    ja: "作文",
    blurb:
      "AI writing prompts drill you on grammar patterns, then grade your Japanese sentences with hints and a verdict.",
    href: "/sentence_practice",
    tone: "plum",
    span: 3,
    tag: "AI",
  },
  {
    icon: "Globe",
    title: "Translator",
    ja: "翻訳",
    blurb:
      "Break a Japanese sentence into its words, grammar and alternative phrasings — with text-to-speech.",
    href: "/translator",
    tone: "mint",
    span: 2,
  },
  {
    icon: "Library",
    title: "Vocabulary Hub",
    ja: "語彙",
    blurb: "Browse the full vocabulary and kanji catalog, filtered by JLPT level from N5 to N1.",
    href: "/vocabulary",
    tone: "honey",
    span: 2,
  },
  {
    icon: "Bookmark",
    title: "Notebook",
    ja: "単語ノート",
    blurb: "One tap saves any word or kanji to a personal list you can come back and review anytime.",
    href: "/notebook",
    tone: "pink",
    span: 2,
  },
  {
    icon: "Users",
    title: "Classrooms",
    ja: "教室",
    blurb:
      "Teachers create groups and share decks and assignments; students join by code and study together.",
    href: "/classrooms",
    tone: "rose",
    span: 3,
  },
  {
    icon: "Trophy",
    title: "Leaderboard",
    ja: "順位",
    blurb:
      "Climb the ranks by streak, EXP and level — with a top-three podium and a jump-to-me shortcut.",
    href: "/leaderboard",
    tone: "honey",
    span: 3,
  },
];

/** Who the platform serves. */
export const roles = [
  {
    key: "student",
    label: "Students",
    ja: "学生",
    line: "Own decks and SRS, study vocab, kanji and grammar, take quizzes and join classes.",
  },
  {
    key: "teacher",
    label: "Teachers",
    ja: "先生",
    line: "Author quizzes and questions, run classrooms, share assignments and track results.",
  },
  {
    key: "admin",
    label: "Admins",
    ja: "管理者",
    line: "Manage users, roles, menus and content, with a full audit trail across the platform.",
  },
] as const;

/* --------------------------------------------------------------------- *
 * Live-preview mock — mirrors real Sakura dashboard components/numbers.  *
 * --------------------------------------------------------------------- */
export const dash = {
  studyDay: 42,
  streak: { current: 7, longest: 21, total: 88 },
  // EXP earned per weekday (T2–CN); the app marks the peak with a bubble.
  exp: {
    labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    values: [40, 65, 35, 80, 55, 120, 90],
    peakLabel: "120 EXP",
  },
  weekly: { done: 5, of: 7 }, // consistency donut
  rank: 3,
  level: { n: 8, pct: 60 },
  missions: [
    { key: "checkin", label: "ĐIỂM DANH", note: "Daily check-in", done: 1, of: 1, status: "Hoàn thành" },
    { key: "week", label: "HỌC ĐỀU 7 NGÀY", note: "Weekly streak", done: 5, of: 7, status: "Đang tiến hành" },
    { key: "level", label: "LEVEL 8", note: "EXP to next level", done: 60, of: 100, status: "Thử thách" },
  ],
} as const;

/** Small proof stats for the hero. */
export const heroStats = [
  { value: "2000", label: "kanji goal" },
  { value: "N5–N1", label: "JLPT levels" },
  { value: "5", label: "study modes" },
  { value: "12+", label: "ways to learn" },
] as const;
