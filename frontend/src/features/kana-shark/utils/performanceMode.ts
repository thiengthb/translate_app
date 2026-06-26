import type { KanaSharkPerformanceMode, KanaSharkSettings } from "../types/kanaShark.types";

export function defaultKanaSharkSettings(mode: KanaSharkPerformanceMode = "balanced"): KanaSharkSettings {
  return {
    mode: "ROMAJI",
    roundSeconds: 60,
    maxItems: 20,
    maxHp: 5,
    maxEnemies: mode === "performance" ? 2 : 3,
    performanceMode: mode,
  };
}

export function particleBudget(mode: KanaSharkPerformanceMode): number {
  return mode === "performance" ? 8 : 18;
}
