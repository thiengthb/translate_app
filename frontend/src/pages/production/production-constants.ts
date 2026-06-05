// Shared display constants for the production (sentence-writing) page.

export const VERDICT_STYLE: Record<string, string> = {
  PASS: "bg-green-600 text-white",
  PARTIAL: "bg-amber-500 text-white",
  FAIL: "bg-red-600 text-white",
};

export const VERDICT_LABEL: Record<string, string> = {
  PASS: "Đúng",
  PARTIAL: "Gần đúng",
  FAIL: "Chưa đạt",
};

export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];

export const LEVEL_RANK: Record<string, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
