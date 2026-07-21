/**
 * Content for the designer-portfolio landing + about pages.
 *
 * Owner: Akira Kuronagi (Nguyễn Đình Ngọc Ân) — a Bridge System Engineering
 * student at FPT University and a frontend developer. Copy lives here (not
 * inline in JSX) so the components read as layout, not prose.
 */

import evRentalShot from "@/assets/portfolio/ev-rental.png";
import ojtLearningShot from "@/assets/portfolio/ojt-learning.png";

export const designer = {
  name: "Akira Kuronagi",
  nameJa: "黒凪 明",
  realName: "Nguyễn Đình Ngọc Ân",
  role: "Bridge SE · Frontend",
  roleJa: "ブリッジSE",
  based: "Quảng Nam → Ho Chi Minh City → 日本",
  email: "dinhngocannguyen@gmail.com",
  heroLead: "Building solutions that connect technology and culture.",
  heroSub:
    "Hi, I'm Akira Kuronagi (Nguyễn Đình Ngọc Ân) — a Software Engineering student at FPT University, majoring in Bridge System Engineering. I focus on designing clean, efficient frontend architecture, and I'm getting ready to become a solid bridge between Vietnamese technology and Japan's IT industry.",
} as const;

export const socials = [
  { label: "GitHub", handle: "@AkiraKuronagi", href: "https://github.com/AkiraKuronagi" },
  {
    label: "LinkedIn",
    handle: "/đình-ngọc-ân-nguyễn",
    href: "https://www.linkedin.com/in/%C4%91%C3%ACnh-ng%E1%BB%8Dc-%C3%A2n-nguy%E1%BB%85n-65a706317/",
  },
  { label: "Facebook", handle: "/nguyen.inh.ngoc.an", href: "https://www.facebook.com/nguyen.inh.ngoc.an" },
  { label: "Email", handle: designer.email, href: `mailto:${designer.email}` },
] as const;

export interface Work {
  index: string; // ordinal label (tategaki)
  title: string;
  glyph: string; // kanji anchoring the visual (fallback / accent)
  image: string; // real project screenshot
  gloss: string; // tech subtitle (Latin)
  summary: string;
  roleTags: string[];
  year: string;
  chip: string; // decorative UI hint shown on the project panel
  tint: "sakura" | "beni" | "hazakura" | "sumi";
}

export const works: Work[] = [
  {
    index: "作品 01",
    title: "EV Station Rental System",
    glyph: "電",
    image: evRentalShot,
    gloss: "SWP391 · ReactJS",
    summary:
      "Frontend architecture built for the SWP391 course project, focused on delivering a smooth, responsive interaction experience for users.",
    roleTags: ["Frontend Development", "ReactJS"],
    year: "2025",
    chip: "Station · ready",
    tint: "sakura",
  },
  {
    index: "作品 02",
    title: "OJT — Learning Base",
    glyph: "学",
    image: ojtLearningShot,
    gloss: "Product Design · Web",
    summary:
      "A comprehensive educational web app: accurate attendance tracking, schedule synchronization, and efficient management of study and work shifts.",
    roleTags: ["Product Design", "Web Interface"],
    year: "2026",
    chip: "Attendance · today",
    tint: "hazakura",
  },
];

export interface Step {
  numeral: string; // kanji numeral — a genuinely ordered sequence (stroke order)
  kanji: string;
  romaji: string;
  label: string;
  body: string;
}

/** Working process, told as "stroke order" — the order here carries meaning. */
export const process: Step[] = [
  {
    numeral: "一",
    kanji: "研究",
    romaji: "kenkyū",
    label: "Research",
    body: "Understand the requirements and the users before writing the first line of code.",
  },
  {
    numeral: "二",
    kanji: "下書き",
    romaji: "shitagaki",
    label: "Sketch",
    body: "Rough out the layout and flow quickly — on paper before it reaches the screen.",
  },
  {
    numeral: "三",
    kanji: "制作",
    romaji: "seisaku",
    label: "Build",
    body: "Realize the interface with ReactJS + TypeScript — real data, real feel.",
  },
  {
    numeral: "四",
    kanji: "推敲",
    romaji: "suikō",
    label: "Refine",
    body: "Polish performance, spacing, and detail until it feels effortless.",
  },
];

/** Story paragraphs — the "how I got here" narrative on the About page. */
export const story: string[] = [
  "My tech journey revolves around modern frontend web development. I build interfaces mainly with ReactJS, TypeScript, Tailwind CSS, Redux and Axios, grounded in the logical thinking I picked up from Java Core. I'd rather go deep and master this toolset than spread myself thin across backend frameworks.",
  "Beyond the code, my greatest passion is the Japanese language and culture. I just sat the JLPT in July 2026, and I keep up a daily habit of practicing vocabulary and conversation. My long-term goal is to work in Japan directly, as a Bridge System Engineer.",
  "Away from the screen, you might find me teaching chess, reading, cooking, swimming, or playing badminton. To recharge, I put on YOASOBI, watch anime like Frieren: Beyond Journey's End, or lose myself in worlds like Honkai: Star Rail and Wuthering Waves.",
];

/** Areas of expertise. */
export const skills = [
  "Frontend Web Development",
  "Bridge System Engineering",
  "UI/UX Implementation",
] as const;

/** Tools I reach for. */
export const tools = ["ReactJS", "TypeScript", "Tailwind CSS", "Redux", "Axios", "Java Core"] as const;
