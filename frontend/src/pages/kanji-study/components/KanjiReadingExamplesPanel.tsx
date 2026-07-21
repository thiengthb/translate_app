import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Volume2 } from "lucide-react";
import { kanjiVocabularyApi } from "@/api/features/kanji_study";
import type { KanjiVocabWord } from "@/types/features/kanji_study";
import { cn } from "@/lib/utils";

/**
 * "Ví dụ phát âm" — vocabulary that uses the kanji, grouped by reading (on/kun),
 * mirroring the mobile app. Used inline by the writing runner's "Hiện ví dụ":
 *
 * - `blank` replaces the target kanji with ○ so an unfinished writing prompt
 *   never reveals the character being practised;
 * - `onWordClick` is only supplied once the question is finished — until then
 *   the rows aren't interactive (no peeking at the answer's detail page).
 */

function speak(text?: string) {
  try {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* TTS unavailable — silently skip */
  }
}

const READING_BADGE: Record<string, string> = {
  ON: "bg-teal-600/80 text-white",
  KUN: "bg-sky-700/80 text-white",
  OTHER: "bg-muted text-muted-foreground",
};

export function KanjiReadingExamplesPanel({
  character,
  blank = false,
  onWordClick,
}: {
  character: string;
  blank?: boolean;
  onWordClick?: (word: KanjiVocabWord) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["kanji-reading-examples", character],
    enabled: !!character,
    staleTime: 10 * 60 * 1000,
    queryFn: () => kanjiVocabularyApi.readingExamples(character, 8),
  });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 size={15} className="animate-spin" /> Đang tải ví dụ...
      </div>
    );
  }
  const groups = data ?? [];
  if (groups.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">Chưa có ví dụ cho Hán tự này.</p>;
  }

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="flex w-full flex-col gap-3 text-left">
      {groups.map((g, gi) => {
        const key = `${g.readingType}-${g.reading ?? "other"}-${gi}`;
        const isCollapsed = collapsed.has(key);
        return (
          <div key={key} className="rounded-xl border border-border bg-card/60">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className={cn("rounded-md px-2 py-0.5 text-sm font-semibold", READING_BADGE[g.readingType] ?? READING_BADGE.OTHER)} lang="ja">
                {g.reading ?? "Khác"}
              </span>
              <span className="text-xs text-muted-foreground">{g.totalCount} từ</span>
              <button
                onClick={() => toggle(key)}
                className="ml-auto text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                {isCollapsed ? "Hiện" : "Ẩn"}
              </button>
            </div>
            {!isCollapsed && (
              <div className="divide-y divide-border/60 border-t border-border/60">
                {g.words.map((w) => (
                  <WordRow key={w.id} word={w} character={character} blank={blank} onWordClick={onWordClick} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WordRow({
  word,
  character,
  blank,
  onWordClick,
}: {
  word: KanjiVocabWord;
  character: string;
  blank: boolean;
  onWordClick?: (word: KanjiVocabWord) => void;
}) {
  const display = blank && character ? word.word.split(character).join("○") : word.word;
  const clickable = !!onWordClick;
  const level = word.levelCode && word.levelCode !== "KHAC" ? word.levelCode : null;

  return (
    <div className="flex items-start gap-2 px-3 py-2.5">
      {/* a div (not a button) so the audio control can nest as a real button */}
      <div
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={() => onWordClick?.(word)}
        className={cn("min-w-0 flex-1 rounded-md", clickable && "cursor-pointer hover:bg-muted/50")}
      >
        {word.reading && (
          <span className="block text-xs text-muted-foreground" lang="ja">{word.reading}</span>
        )}
        <span className="inline-flex items-center gap-2">
          <span className="text-xl font-medium text-foreground" lang="ja">{display}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); speak(word.reading || word.word); }}
            className="text-muted-foreground hover:text-foreground"
            title="Phát âm"
          >
            <Volume2 size={16} />
          </button>
        </span>
        {word.meaningText && (
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {word.wordType && <span className="mr-1.5 text-xs font-medium text-sky-600 dark:text-sky-400">{word.wordType}</span>}
            {word.meaningText}
          </span>
        )}
      </div>
      <span className="flex shrink-0 items-center gap-1 pt-0.5">
        {word.frequency != null && (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground" title="Thông dụng">
            C
          </span>
        )}
        {level && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{level}</span>
        )}
        {word.frequency != null && (
          <span className="rounded bg-emerald-600/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {word.frequency}
          </span>
        )}
      </span>
    </div>
  );
}
