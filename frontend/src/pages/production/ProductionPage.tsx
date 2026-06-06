import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, Shuffle, Sparkles, X } from "lucide-react";

import axiosInstance from "@/api/axios";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  productionApi,
  type AttemptResult,
  type ExerciseResponse,
  type GrammarOption,
  type VocabSource,
} from "@/api/features/production.api";
import {
  JLPT_LEVELS,
  LEVEL_RANK,
  VERDICT_LABEL,
  VERDICT_STYLE,
} from "./production-constants";

interface DeckOption {
  id: number;
  title: string;
}

type Mode = "random" | "drill";

/** The exercise prompt card (level + grammar + AI badge + situation + hint words). */
function PromptCard({ exercise }: { exercise: ExerciseResponse }) {
  return (
    <Card className="p-6 gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary">{exercise.jlptLevel}</Badge>
        <span className="text-sm text-muted-foreground">{exercise.subUseName}</span>
        {exercise.generated && (
          <Badge variant="outline" className="gap-1">
            <Sparkles size={12} /> AI
          </Badge>
        )}
      </div>
      <pre className="whitespace-pre-wrap font-inter text-sm leading-relaxed">
        {exercise.l1Prompt}
      </pre>
      {exercise.words && exercise.words.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {exercise.words.map((w) => (
            <Badge key={w} variant="secondary" className="font-normal">
              {w}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * Normalize a Japanese sentence for "is this meaningfully different?" comparison:
 * drop whitespace, punctuation, and trailing sentence-final particles so that two
 * sentences differing only by e.g. a final ね are treated as the same.
 */
function normalizeJp(s: string): string {
  return s
    .replace(/\s/g, "")
    .replace(/[。、，．！？!?・…]/g, "")
    .replace(/[ねよなわぞぜ]+$/u, "");
}

/** The grading result card (verdict + structure + reference + your answer + feedback). */
function ResultCard({
  result,
  submittedAnswer,
}: {
  result: AttemptResult;
  submittedAnswer: string;
}) {
  // Only show the correction when it actually differs (in meaning) from both the
  // learner's own sentence and the reference answer — otherwise it just duplicates
  // the "Đáp án mẫu" box (e.g. learner typed only isolated words, so the model
  // returned a full sentence ≈ the reference).
  const correctionNorm = normalizeJp(result.correction ?? "");
  const showCorrection =
    !!result.correction &&
    correctionNorm !== normalizeJp(submittedAnswer) &&
    correctionNorm !== normalizeJp(result.referenceAnswer ?? "");
  return (
    <Card className="p-6 gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={VERDICT_STYLE[result.finalVerdict]}>
          {VERDICT_LABEL[result.finalVerdict] ?? result.finalVerdict}
        </Badge>
        {result.judgeScore != null && (
          <span className="text-sm font-semibold">
            Điểm: {(result.judgeScore * 10).toFixed(1)}/10
          </span>
        )}
        <Badge variant={result.detectorPassed ? "secondary" : "outline"} className="ml-auto">
          {result.detectorPassed ? "Có thấy mẫu ngữ pháp" : "Chưa thấy mẫu ngữ pháp"}
        </Badge>
      </div>

      {result.referenceAnswer && (
        <div className="border-l-4 border-green-600 bg-green-600/5 pl-4 py-2">
          <div className="text-xs uppercase tracking-wide text-green-600 font-semibold mb-1">
            Đáp án mẫu (10/10)
          </div>
          <p className="text-base leading-relaxed">{result.referenceAnswer}</p>
        </div>
      )}

      {submittedAnswer && (
        <div className="border-l-4 border-muted-foreground/30 pl-4 py-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Câu của bạn
          </div>
          <p className="text-base leading-relaxed">{submittedAnswer}</p>
        </div>
      )}

      {showCorrection && (
        <div className="border-l-4 border-amber-500 bg-amber-500/5 pl-4 py-2">
          <div className="text-xs uppercase tracking-wide text-amber-500 font-semibold mb-1">
            Gợi ý sửa câu của bạn
          </div>
          <p className="text-base leading-relaxed">{result.correction}</p>
        </div>
      )}

      {result.feedback && (
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {result.feedback}
        </p>
      )}
    </Card>
  );
}

export default function ProductionPage() {
  // ── setup data ──
  const [grammars, setGrammars] = useState<GrammarOption[]>([]);
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [setupLoading, setSetupLoading] = useState(true);

  // ── setup selections ──
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sourceType, setSourceType] = useState<VocabSource["type"]>("LEVEL");
  const [level, setLevel] = useState("N5");
  const [deckId, setDeckId] = useState<number | null>(null);
  const [countPer, setCountPer] = useState(2);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

  // ── runtime ──
  const [mode, setMode] = useState<Mode | null>(null);
  const [queue, setQueue] = useState<number[]>([]); // drill: subUseId per slot
  const [index, setIndex] = useState(0);
  const [exercise, setExercise] = useState<ExerciseResponse | null>(null);
  const [answer, setAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setSetupLoading(true);
      try {
        const [g, deckRes] = await Promise.all([
          productionApi.listGrammars(),
          axiosInstance
            .get("/decks", { params: { page: 0, size: 100 } })
            .then((r) => (Array.isArray(r.data) ? r.data : r.data?.content ?? []))
            .catch(() => []),
        ]);
        setGrammars(g);
        const deckOptions = (deckRes as any[])
          .map((d) => ({ id: d.id, title: d.title }))
          .filter((d) => d.id != null);
        setDecks(deckOptions);
        if (deckOptions.length > 0) setDeckId(deckOptions[0].id);
      } catch {
        toast.error("Không tải được danh sách ngữ pháp. Kiểm tra backend đã chạy chưa.");
      } finally {
        setSetupLoading(false);
      }
    })();
  }, []);

  const grammarsByLevel = useMemo(() => {
    const groups = new Map<string, GrammarOption[]>();
    for (const g of grammars) {
      const lvl = g.jlptLevel ?? "—";
      if (!groups.has(lvl)) groups.set(lvl, []);
      groups.get(lvl)!.push(g);
    }
    return [...groups.entries()].sort(
      (a, b) => (LEVEL_RANK[a[0]] ?? 99) - (LEVEL_RANK[b[0]] ?? 99),
    );
  }, [grammars]);

  const toggleLevel = (lvl: string) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  };

  const toggleGrammar = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentSource = useCallback(
    (): VocabSource =>
      sourceType === "DECK"
        ? { type: "DECK", deckId: deckId ?? undefined }
        : { type: "LEVEL", level },
    [sourceType, deckId, level],
  );

  const resetAnswer = () => {
    setResult(null);
    setAnswer("");
    setSubmittedAnswer("");
  };

  const handleGenError = (e: any) => {
    const msg =
      e?.response?.status === 503
        ? "Chưa sinh được câu cho mẫu này (AI có thể đang bận). Hãy thử lại hoặc chọn mẫu khác."
        : "Không tải được câu hỏi. Vui lòng thử lại.";
    toast.error(msg);
  };

  const generateRandom = useCallback(async () => {
    resetAnswer();
    setExercise(null);
    setGenerating(true);
    try {
      setExercise(await productionApi.generateExercise(undefined, currentSource()));
    } catch (e: any) {
      handleGenError(e);
    } finally {
      setGenerating(false);
    }
  }, [currentSource]);

  const generateAt = useCallback(
    async (slotIndex: number, slots: number[]) => {
      const subUseId = slots[slotIndex];
      if (subUseId == null) return;
      resetAnswer();
      setExercise(null);
      setGenerating(true);
      try {
        setExercise(await productionApi.generateExercise(subUseId, currentSource()));
      } catch (e: any) {
        handleGenError(e);
      } finally {
        setGenerating(false);
      }
    },
    [currentSource],
  );

  const start = () => {
    if (sourceType === "DECK" && deckId == null) {
      toast.error("Hãy chọn một bộ thẻ để lấy từ vựng.");
      return;
    }
    setSetupCollapsed(true);
    if (selected.size === 0) {
      // Random mode: server picks a grammar point each time.
      setMode("random");
      setQueue([]);
      setIndex(0);
      void generateRandom();
      return;
    }
    // Drill mode: round-robin interleave so a grammar doesn't repeat back-to-back.
    const ids = [...selected];
    const slots: number[] = [];
    for (let round = 0; round < countPer; round++) {
      for (const id of ids) slots.push(id);
    }
    setMode("drill");
    setQueue(slots);
    setIndex(0);
    void generateAt(0, slots);
  };

  const onSubmit = async () => {
    const snapshot = answer.trim();
    if (!exercise || !snapshot) return;
    setSubmitting(true);
    try {
      const res = await productionApi.submitAttempt(exercise.promptId, answer);
      setSubmittedAnswer(answer);
      setResult(res);
    } catch {
      toast.error("Chấm bài thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (mode === "random") {
      void generateRandom();
      return;
    }
    const ni = index + 1;
    setIndex(ni);
    if (ni < queue.length) void generateAt(ni, queue);
  };

  const finishedDrill = mode === "drill" && index >= queue.length;
  const started = mode !== null;
  const startLabel =
    selected.size === 0 ? "Sinh câu ngẫu nhiên" : `Bắt đầu luyện (${selected.size * countPer} câu)`;

  return (
    <MainLayout pathName={{ "/sentence_practice": "Luyện viết câu" }}>
      <div className="w-full flex flex-col gap-6 max-w-3xl">
        {/* ── Setup ─────────────────────────────────────────────── */}
        {setupLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : setupCollapsed && started ? (
          <Card className="p-4 flex-row items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              {selected.size === 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Shuffle size={14} /> Ngẫu nhiên
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Sparkles size={14} /> {selected.size} mẫu × {countPer}
                </span>
              )}
              <span>• Từ vựng: {sourceType === "DECK" ? "bộ thẻ" : level}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSetupCollapsed(false)}>
              Đổi tùy chọn
            </Button>
          </Card>
        ) : (
          <Card className="p-6 gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Chọn mẫu ngữ pháp (tùy chọn)</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Để trống = AI sinh câu ngẫu nhiên. Chọn vài mẫu = luyện đúng các mẫu đó.
                </p>
              </div>
              {started && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 -mt-1 -mr-2"
                  onClick={() => setSetupCollapsed(true)}
                >
                  <X size={16} /> Đóng
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {grammarsByLevel.map(([lvl, items]) => {
                const open = expandedLevels.has(lvl);
                const selectedInLevel = items.filter((g) => selected.has(g.id)).length;
                return (
                  <div key={lvl} className="rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleLevel(lvl)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/40 hover:bg-muted transition-colors text-left"
                    >
                      <ChevronDown
                        size={16}
                        className={
                          "text-muted-foreground transition-transform " +
                          (open ? "" : "-rotate-90")
                        }
                      />
                      <span className="text-sm font-semibold">{lvl}</span>
                      <span className="text-xs text-muted-foreground">
                        {items.length} mẫu
                      </span>
                      {selectedInLevel > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          Đã chọn {selectedInLevel}
                        </Badge>
                      )}
                    </button>
                    {open && (
                      <div className="flex flex-wrap gap-2 p-3">
                        {items.map((g) => {
                          const on = selected.has(g.id);
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => toggleGrammar(g.id)}
                              className={
                                "px-3 py-1 rounded-full text-sm border transition-colors " +
                                (on
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background hover:bg-muted border-border")
                              }
                            >
                              {g.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-end gap-4 border-t border-border pt-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Nguồn từ vựng</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType("LEVEL")}
                    className={
                      "px-3 py-1.5 rounded-md text-sm border " +
                      (sourceType === "LEVEL"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border")
                    }
                  >
                    Cấp độ JLPT
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType("DECK")}
                    className={
                      "px-3 py-1.5 rounded-md text-sm border " +
                      (sourceType === "DECK"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border")
                    }
                  >
                    Bộ thẻ của tôi
                  </button>
                </div>
              </label>

              {sourceType === "LEVEL" ? (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Cấp độ</span>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {JLPT_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              ) : decks.length > 0 ? (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Bộ thẻ</span>
                  <select
                    value={deckId ?? ""}
                    onChange={(e) => setDeckId(Number(e.target.value))}
                    className="w-56 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="text-sm text-muted-foreground self-center">
                  Bạn chưa có bộ thẻ nào — dùng nguồn theo cấp độ JLPT.
                </div>
              )}

              {selected.size > 0 && (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Số câu mỗi mẫu</span>
                  <select
                    value={countPer}
                    onChange={(e) => setCountPer(Number(e.target.value))}
                    className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={start} disabled={generating}>
                {selected.size === 0 ? <Shuffle size={16} /> : <Sparkles size={16} />}
                {startLabel}
              </Button>
              {selected.size > 0 && (
                <span className="text-sm text-muted-foreground">Đã chọn: {selected.size} mẫu</span>
              )}
            </div>
          </Card>
        )}

        {/* ── Exercise ──────────────────────────────────────────── */}
        {started && finishedDrill ? (
          <Card className="p-6 gap-4">
            <div className="font-semibold text-lg">Hoàn thành! 🎉</div>
            <p className="text-sm text-muted-foreground">
              Bạn đã luyện xong {queue.length} câu.
            </p>
            <div>
              <Button
                onClick={() => {
                  setMode(null);
                  setExercise(null);
                  resetAnswer();
                  setSetupCollapsed(false);
                }}
              >
                Luyện tiếp
              </Button>
            </div>
          </Card>
        ) : started ? (
          <>
            {mode === "drill" && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Câu {Math.min(index + 1, queue.length)} / {queue.length}
                </span>
              </div>
            )}

            {generating ? (
              <Card className="p-6 flex-row items-center justify-center gap-3 h-40">
                <Loader2 className="animate-spin text-primary" size={24} />
                <span className="text-sm text-muted-foreground">Đang sinh câu…</span>
              </Card>
            ) : exercise ? (
              <>
                <PromptCard exercise={exercise} />

                <Card className="p-6 gap-4">
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Viết câu trả lời bằng tiếng Nhật..."
                    rows={3}
                    maxLength={1000}
                    disabled={submitting}
                  />
                  <div className="flex items-center gap-3">
                    <Button onClick={onSubmit} disabled={submitting || !answer.trim()}>
                      {submitting && <Loader2 className="animate-spin" size={16} />}
                      Nộp bài
                    </Button>
                    {(mode === "random" || result) && (
                      <Button variant="outline" onClick={next} disabled={submitting || generating}>
                        {mode === "drill" && index + 1 >= queue.length ? "Hoàn thành" : "Câu tiếp"}
                      </Button>
                    )}
                  </div>
                </Card>

                {result && <ResultCard result={result} submittedAnswer={submittedAnswer} />}
              </>
            ) : (
              <Card className="p-6 gap-4">
                <p className="text-sm text-muted-foreground">
                  Chưa sinh được câu. Hãy thử lại.
                </p>
                <div className="flex gap-3">
                  <Button onClick={next}>
                    <ChevronDown className="rotate-[-90deg]" size={16} />
                    Thử câu khác
                  </Button>
                </div>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
