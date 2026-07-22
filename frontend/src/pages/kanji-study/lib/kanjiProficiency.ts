/**
 * Kanji proficiency ladder — the five "Tiến độ Hán tự" levels.
 *
 * The backend (KanjiStudyService.updateProgress) stores the authoritative level
 * on `KanjiProgress.status`. Ordinary quiz/writing study climbs the first four
 * levels from the per-kanji correct/wrong counts; the top level — MASTERED
 * ("Thành thạo") — is awarded only by the (upcoming) Challenges feature, so it
 * shows in the ladder but stays at zero until Challenges ships.
 */

export type KanjiProficiency = "NEW" | "KNOWN" | "FAMILIAR" | "PROFICIENT" | "MASTERED";

export interface ProficiencyMeta {
  key: KanjiProficiency;
  /** Vietnamese label shown in the UI. */
  label: string;
  /** Tailwind background for the legend dot / distribution segment. */
  color: string;
  /** Awarded only by the Challenges feature (not by ordinary study). */
  challengeOnly?: boolean;
}

/** Ordered low → high; drives the legend order and the distribution bar. */
export const PROFICIENCY_LEVELS: ProficiencyMeta[] = [
  { key: "NEW", label: "Chưa biết", color: "bg-muted-foreground/30" },
  { key: "KNOWN", label: "Đã biết", color: "bg-chart-5" },
  { key: "FAMILIAR", label: "Đã quen", color: "bg-chart-1" },
  { key: "PROFICIENT", label: "Biết rõ", color: "bg-primary" },
  { key: "MASTERED", label: "Thành thạo", color: "bg-chart-3", challengeOnly: true },
];

/**
 * Normalise a stored status string into one of the five levels. Legacy
 * "LEARNING" rows (from the old binary scheme) count as the first studied level
 * until they're re-studied and the backend rewrites them precisely.
 */
export function normalizeProficiency(status?: string | null): KanjiProficiency {
  switch ((status ?? "").toUpperCase()) {
    case "MASTERED":
      return "MASTERED";
    case "PROFICIENT":
      return "PROFICIENT";
    case "FAMILIAR":
      return "FAMILIAR";
    case "KNOWN":
    case "LEARNING":
      return "KNOWN";
    default:
      return "NEW";
  }
}

/** A fresh per-level tally with every level at zero. */
export function emptyProficiencyCounts(): Record<KanjiProficiency, number> {
  return { NEW: 0, KNOWN: 0, FAMILIAR: 0, PROFICIENT: 0, MASTERED: 0 };
}
