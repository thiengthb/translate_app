/**
 * Content for the "Yozakura / 夜桜 — Night Bloom" designer profile at /profile.
 *
 * A fictional persona: Hana Mizuno (水野 花), a Tokyo-based product &
 * interaction designer. Copy lives here (not inline in JSX) so the page
 * component reads as layout, not prose. Everything is invented for this
 * showcase — no real person or client is depicted.
 */

export const designer = {
  name: "Hana Mizuno",
  nameJa: "水野 花",
  role: "Product & Interaction Designer",
  roleJa: "プロダクト・デザイナー",
  based: "Tokyo, Japan",
  basedJa: "東京",
  email: "hana@mizuno.design",
  /** Vertical Japanese eyebrow shown beside the hero name. */
  eyebrowJa: "夜桜",
  eyebrowRomaji: "yozakura · night bloom",
  /** One-line thesis — the most characteristic thing about her work. */
  statement:
    "I design interfaces that bloom quietly — calm at rest, alive in the hand.",
  /** Availability moment. */
  availability: "Open for select work · Spring 2026",
  /** Longer intro used under the hero / in the about strip. */
  bio: "Nine years turning ambiguous product problems into interfaces people trust. I work at the seam of motion, systems and craft — the small decisions that make a screen feel effortless the first time you touch it.",
} as const;

export interface Stat {
  value: string;
  label: string;
  glyph: string; // JP glyph accent
}

/** At-a-glance credibility figures — labelled by what they mean. */
export const stats: Stat[] = [
  { value: "09", label: "Years in product", glyph: "年" },
  { value: "74", label: "Interfaces shipped", glyph: "作" },
  { value: "12", label: "Awards & honors", glyph: "賞" },
  { value: "27", label: "Teams partnered", glyph: "組" },
];

export interface Craft {
  key: string;
  label: string;
  labelJa: string;
  /** Mastery 0–100 — drives the petal's reach in the signature bloom. */
  level: number;
  note: string;
}

/**
 * The five crafts — mapped one-to-one onto the five petals of a sakura
 * blossom (cherry blossoms have exactly five petals), so the flower itself
 * becomes the skill chart. Order runs clockwise from the top petal.
 */
export const crafts: Craft[] = [
  { key: "ui", label: "UI Design", labelJa: "画面", level: 96, note: "Type, grid, colour and the pixel-level polish that reads as calm." },
  { key: "systems", label: "Design Systems", labelJa: "体系", level: 94, note: "Tokens, components and the docs that let a whole org move as one." },
  { key: "ux", label: "UX & Product", labelJa: "設計", level: 91, note: "Research, flows and the judgement to cut what nobody needs." },
  { key: "motion", label: "Interaction & Motion", labelJa: "動き", level: 88, note: "Timing, easing and feedback — the difference between static and alive." },
  { key: "proto", label: "Prototyping", labelJa: "試作", level: 85, note: "High-fidelity, coded prototypes that test the real feel, not a picture of it." },
];

export interface Work {
  index: string; // tategaki ordinal
  title: string;
  glyph: string; // kanji anchoring the visual
  gloss: string; // discipline subtitle
  summary: string;
  tags: string[];
  year: string;
  metric: string; // one concrete outcome
  tint: "sakura" | "gold" | "leaf";
}

/** Selected work — three invented projects. */
export const works: Work[] = [
  {
    index: "作 01",
    title: "Hanami",
    glyph: "花",
    gloss: "Wellness · iOS + Android",
    summary:
      "A meditation companion that turns a daily calm habit into a garden that blooms as you return. Motion carries the whole reward loop — no badges, no streak guilt.",
    tags: ["Product Design", "Motion", "iOS"],
    year: "2025",
    metric: "Day-30 retention +41%",
    tint: "sakura",
  },
  {
    index: "作 02",
    title: "Tsuki",
    glyph: "月",
    gloss: "Fintech · Design System",
    summary:
      "Nighttime-first banking. High-contrast, glanceable, and honest about money — a dark interface that stays legible at 2am and a token system that keeps 40 screens in tune.",
    tags: ["UX", "Design Systems", "Fintech"],
    year: "2024",
    metric: "Support tickets −33%",
    tint: "gold",
  },
  {
    index: "作 03",
    title: "Kumo",
    glyph: "雲",
    gloss: "Platform · Tooling",
    summary:
      "A cross-platform design system and token pipeline for a 40-person product org — one source of truth flowing from Figma into React, SwiftUI and Compose without a translation layer.",
    tags: ["Systems", "Tokens", "Dev Tooling"],
    year: "2023",
    metric: "Ship time −2 weeks / feature",
    tint: "leaf",
  },
];

export interface Honor {
  year: string;
  title: string;
  org: string;
}

/** Recognition — a short, ordered list (recent first). */
export const honors: Honor[] = [
  { year: "2025", title: "Site of the Day — Hanami", org: "Awwwards" },
  { year: "2024", title: "UI Design, Winner — Tsuki", org: "CSS Design Awards" },
  { year: "2024", title: "Interface & Motion, speaker", org: "Tokyo Design Week" },
  { year: "2023", title: "Brand & Communication Design", org: "Red Dot Award" },
];

export interface Social {
  label: string;
  handle: string;
  href: string;
}

export const socials: Social[] = [
  { label: "Dribbble", handle: "@hanamizuno", href: "https://dribbble.com" },
  { label: "Are.na", handle: "/hana-mizuno", href: "https://are.na" },
  { label: "Read.cv", handle: "/hana", href: "https://read.cv" },
  { label: "Email", handle: designer.email, href: `mailto:${designer.email}` },
];
