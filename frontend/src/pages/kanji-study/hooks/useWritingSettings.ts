import { useCallback, useEffect, useState } from "react";
import type { Leniency } from "../lib/strokeMatch";

/**
 * Settings for the writing study mode — the two option sheets from the mobile
 * app ("Đã hiển thị nội dung" + the gear settings). Persisted to localStorage
 * so a learner's preferences stick between sessions, exactly like the app.
 */

export type QuizOrder = "ACCURACY" | "RANDOM" | "SEQUENTIAL";

export interface WritingSettings {
  /* ── content shown on the prompt (Picture 2) ── */
  showOnyomi: boolean; // Âm On
  showKunyomi: boolean; // Âm Kun
  showExtraReadings: boolean; // Phát âm bổ sung (Hán-Việt)
  showMeaning: boolean; // Ý nghĩa
  showNotes: boolean; // Ghi chú (etymology / form explanation)

  /* ── behaviour (Picture 3) ── */
  repeatOnWrong: boolean; // Thêm câu hỏi khi trả lời sai
  pauseAfterAnswer: boolean; // Tạm dừng sau khi trả lời
  order: QuizOrder; // Quiz order
  leniency: Leniency; // Chỉnh nét (THẤP / VỪA / CAO)
  showHint: boolean; // Hiện gợi ý (reveal stroke after misses)
  redoUntilPerfect: boolean; // Làm lại đến khi hoàn hảo
  playReadingAudio: boolean; // Play reading audio (TTS)
  showAnswer: boolean; // Xem đáp án (faint outline to trace)
  hypermode: boolean; // Hypermode (no guide, info hidden)

  /* ── review scope (the accuracy slider, shared by all modes) ── */
  accuracyMax: number; // Loại trừ kanji có độ chính xác cao hơn mức này (0–100)
  onlyFavorites: boolean; // Chỉ yêu thích

  /* ── runner ── */
  count: number; // Số câu hỏi
}

export const DEFAULT_WRITING_SETTINGS: WritingSettings = {
  showOnyomi: true,
  showKunyomi: true,
  showExtraReadings: true,
  showMeaning: true,
  showNotes: true,
  repeatOnWrong: false,
  pauseAfterAnswer: true,
  order: "ACCURACY",
  leniency: "MEDIUM",
  showHint: true,
  redoUntilPerfect: true,
  playReadingAudio: false,
  showAnswer: false,
  hypermode: false,
  accuracyMax: 100,
  onlyFavorites: false,
  count: 10,
};

const STORAGE_KEY = "kanji-writing-settings";

function load(): WritingSettings {
  if (typeof localStorage === "undefined") return DEFAULT_WRITING_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WRITING_SETTINGS;
    // Merge over defaults so a newly-added setting picks up its default.
    return { ...DEFAULT_WRITING_SETTINGS, ...(JSON.parse(raw) as Partial<WritingSettings>) };
  } catch {
    return DEFAULT_WRITING_SETTINGS;
  }
}

export function useWritingSettings() {
  const [settings, setSettings] = useState<WritingSettings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* private mode / quota — settings just won't persist */
    }
  }, [settings]);

  const update = useCallback(
    <K extends keyof WritingSettings>(key: K, value: WritingSettings[K]) =>
      setSettings((s) => ({ ...s, [key]: value })),
    []
  );

  const toggle = useCallback(
    (key: {
      [K in keyof WritingSettings]: WritingSettings[K] extends boolean ? K : never;
    }[keyof WritingSettings]) => setSettings((s) => ({ ...s, [key]: !s[key] })),
    []
  );

  return { settings, setSettings, update, toggle };
}
