import { animate, stagger, utils } from "animejs";

/**
 * Anime.js v4 micro-interactions for the grammar learning flow.
 * Every helper no-ops when the user prefers reduced motion.
 */
const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Staggered fade-and-rise of every `[data-anim="card"]` inside the root. */
export function enterCards(root: HTMLElement | null) {
  if (!root || reducedMotion()) return;
  const els = root.querySelectorAll<HTMLElement>('[data-anim="card"]');
  if (!els.length) return;
  animate(els, {
    opacity: [0, 1],
    translateY: [16, 0],
    duration: 450,
    ease: "out(3)",
    delay: stagger(90),
  });
}

/** Fade-and-rise of a single element (e.g. a grading card appearing mid-screen). */
export function reveal(el: HTMLElement | null) {
  if (!el || reducedMotion()) return;
  animate(el, {
    opacity: [0, 1],
    translateY: [14, 0],
    duration: 400,
    ease: "out(3)",
  });
}

/** Horizontal shake — wrong or near-miss answer. */
export function shake(el: HTMLElement | null) {
  if (!el || reducedMotion()) return;
  animate(el, {
    keyframes: [
      { translateX: -9 },
      { translateX: 9 },
      { translateX: -6 },
      { translateX: 6 },
      { translateX: -3 },
      { translateX: 0 },
    ],
    duration: 420,
    ease: "inOutQuad",
  });
}

/** Springy pop — correct answer / completion icon. */
export function pop(el: HTMLElement | null) {
  if (!el || reducedMotion()) return;
  animate(el, {
    scale: [
      { to: 1.25, duration: 180, ease: "out(2)" },
      { to: 1, duration: 420, ease: "outElastic(1, .5)" },
    ],
  });
}

/** Animate the session progress bar to a fraction (0..1). */
export function fillProgress(el: HTMLElement | null, fraction: number) {
  if (!el) return;
  const width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
  if (reducedMotion()) {
    el.style.width = width;
    return;
  }
  animate(el, { width, duration: 600, ease: "outQuart" });
}

/** Springy pop-and-fade of a streak combo label (Duolingo-style). */
export function comboPop(el: HTMLElement | null) {
  if (!el || reducedMotion()) return;
  animate(el, {
    opacity: [0, 1, 1, 0],
    scale: [0.5, 1.2, 1, 1],
    translateY: [14, 0, 0, -18],
    duration: 1200,
    ease: "out(3)",
  });
}

/**
 * Lightning strike: a bolt draws top→bottom while the screen flashes, for big
 * streak milestones. Expects `[data-fx="bolt"]` (an SVG path) and `[data-fx="flash"]`
 * (a full-screen overlay) inside `root`.
 */
export function lightningStrike(root: HTMLElement | null) {
  if (!root || reducedMotion()) return;
  const flash = root.querySelector<HTMLElement>('[data-fx="flash"]');
  const bolt = root.querySelector<SVGPathElement>('[data-fx="bolt"]');
  if (flash) {
    animate(flash, { opacity: [0, 0.55, 0], duration: 480, ease: "out(2)" });
  }
  if (bolt) {
    const len = bolt.getTotalLength();
    bolt.style.strokeDasharray = String(len);
    animate(bolt, {
      strokeDashoffset: [len, 0],
      opacity: [1, 1, 0],
      duration: 560,
      ease: "out(2)",
    });
  }
}

/** Count a number element up from 0 to its target value. */
export function countUp(el: HTMLElement | null, to: number, prefix = "") {
  if (!el) return;
  if (reducedMotion() || to <= 0) {
    el.textContent = `${prefix}${to}`;
    return;
  }
  const counter = { value: 0 };
  animate(counter, {
    value: to,
    duration: 900,
    ease: "outExpo",
    modifier: utils.round(0),
    onUpdate: () => {
      el.textContent = `${prefix}${counter.value}`;
    },
  });
}
