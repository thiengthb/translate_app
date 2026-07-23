import { useCallback, useEffect, useState } from "react";
import type { QuizOrder } from "./useWritingSettings";

/**
 * Settings for the Trắc nghiệm (quiz) study mode. Two option sheets, mirroring
 * the mobile app:
 *  - "Cài đặt trắc nghiệm" — the per-type content shown on a question. The
 *    visible toggles depend on the quiz type (a clue can't reveal its own
 *    answer), and the example quiz uses the example picker below instead.
 *  - "Cài đặt chung" — general behaviour (order, pause, repeat, audio).
 *
 * Persisted to localStorage under its own key so the quiz keeps preferences
 * independent of Luyện viết ({@link ./useWritingSettings}).
 */

export type { QuizOrder };

/** "Ví dụ → Kanji" example source — a single word, or a whole sentence. */
export type ExampleSource = "WORD" | "SENTENCE";

/** JLPT filter for the example pool; "ALL" disables the filter. */
export type JlptFilter = "ALL" | "N5" | "N4" | "N3" | "N2" | "N1";
export const JLPT_CYCLE: JlptFilter[] = ["ALL", "N5", "N4", "N3", "N2", "N1"];
export const JLPT_LABEL: Record<JlptFilter, string> = {
  ALL: "Tất cả",
  N5: "N5",
  N4: "N4",
  N3: "N3",
  N2: "N2",
  N1: "N1",
};

export interface QuizSettings {
  /* ── content shown on a question ("Cài đặt trắc nghiệm") ── */
  showOnyomi: boolean; // Âm On
  showKunyomi: boolean; // Âm Kun
  showExtraReadings: boolean; // Phát âm bổ sung (Hán-Việt)
  showMeaning: boolean; // Ý nghĩa
  showNotes: boolean; // Ghi chú

  /* ── example quiz ("Ví dụ → Kanji") ── */
  exampleSource: ExampleSource; // Từ vựng ngẫu nhiên / Câu ngẫu nhiên
  exampleJlpt: JlptFilter; // Từ vựng JLPT
  exampleCommonOnly: boolean; // Phổ biến (frequency-ranked words only)
  exampleShowMeaning: boolean; // Gợi ý: hiện nghĩa của ví dụ
  exampleShowFurigana: boolean; // Gợi ý: hiện furigana (cách đọc)

  /* ── general behaviour ("Cài đặt chung") ── */
  order: QuizOrder; // Thứ tự học
  pauseAfterAnswer: boolean; // Tạm dừng sau khi trả lời
  repeatOnWrong: boolean; // Thêm câu hỏi khi trả lời sai
  playReadingAudio: boolean; // Phát âm đọc

  /* ── review scope (the accuracy slider, shared by all modes) ── */
  accuracyMax: number; // Loại trừ kanji có độ chính xác cao hơn mức này (0–100)
  onlyFavorites: boolean; // Chỉ yêu thích
  examplesPerKanji: number; // "Ví dụ → Kanji": số ví dụ mỗi kanji
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  showOnyomi: true,
  showKunyomi: true,
  showExtraReadings: false,
  showMeaning: true,
  showNotes: true,
  exampleSource: "WORD",
  exampleJlpt: "ALL",
  exampleCommonOnly: true,
  exampleShowMeaning: true,
  exampleShowFurigana: true,
  order: "ACCURACY",
  pauseAfterAnswer: false,
  repeatOnWrong: false,
  playReadingAudio: false,
  accuracyMax: 100,
  onlyFavorites: false,
  examplesPerKanji: 1,
};

const STORAGE_KEY = "kanji-quiz-settings";

function load(): QuizSettings {
  if (typeof localStorage === "undefined") return DEFAULT_QUIZ_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUIZ_SETTINGS;
    // Merge over defaults so a newly-added setting picks up its default.
    return { ...DEFAULT_QUIZ_SETTINGS, ...(JSON.parse(raw) as Partial<QuizSettings>) };
  } catch {
    return DEFAULT_QUIZ_SETTINGS;
  }
}

export function useQuizSettings() {
  const [settings, setSettings] = useState<QuizSettings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* private mode / quota — settings just won't persist */
    }
  }, [settings]);

  const update = useCallback(
    <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) =>
      setSettings((s) => ({ ...s, [key]: value })),
    []
  );

  const toggle = useCallback(
    (key: {
      [K in keyof QuizSettings]: QuizSettings[K] extends boolean ? K : never;
    }[keyof QuizSettings]) => setSettings((s) => ({ ...s, [key]: !s[key] })),
    []
  );

  return { settings, setSettings, update, toggle };
}
