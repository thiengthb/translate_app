import type { Variants } from "framer-motion";

/** Shared reveal used across sections via Framer Motion's `whileInView`. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

/** One in-view config reused everywhere — fire once, a little before center. */
export const inView = { once: true, margin: "-12% 0px -12% 0px" } as const;
