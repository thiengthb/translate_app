import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

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
  type VocabWordItem,
} from "@/api/features/production.api";

const VERDICT_STYLE: Record<string, string> = {
  PASS: "bg-green-600 text-white",
  PARTIAL: "bg-amber-500 text-white",
  FAIL: "bg-red-600 text-white",
};

const VERDICT_LABEL: Record<string, string> = {
  PASS: "Đúng",
  PARTIAL: "Gần đúng",
  FAIL: "Chưa đạt",
};

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const LEVEL_RANK: Record<string, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };

interface DeckOption {
  id: number;
  title: string;
}

type Phase = "setup" | "drilling" | "done";
type DrillMode = "count" | "coverage";

interface Step {
  grammarId: number;
  target?: VocabWordItem;
}

export default function DrillPage() {
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
  const [mode, setMode] = useState<DrillMode>("count");
  // coverage mode (drill until the chosen vocab set is exhausted)
  const [vocabAll, setVocabAll] = useState<VocabWordItem[]>([]);
  const [vocabLoading, setVocabLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0); // 0 = all
  const [manualPick, setManualPick] = useState(false);
  const [pickedWords, setPickedWords] = useState<Set<string>>(new Set());

  // ── drill runtime ──
  const [phase, setPhase] = useState<Phase>("setup");
  const [queue, setQueue] = useState<Step[]>([]);
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
        setDecks(
          (deckRes as any[])
            .map((d) => ({ id: d.id, title: d.title }))
            .filter((d) => d.id != null),
        );
        if (deckRes.length > 0) setDeckId(deckRes[0].id);
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

  const generateAt = useCallback(
    async (slotIndex: number, slots: number[]) => {
      const subUseId = slots[slotIndex];
      if (subUseId == null) return;
      setGenerating(true);
      setResult(null);
      setAnswer("");
      setSubmittedAnswer("");
      setExercise(null);
      try {
        setExercise(await productionApi.generateExercise(subUseId, currentSource()));
      } catch (e: any) {
        const msg =
          e?.response?.status === 503
            ? "AI đang offline và ngữ pháp này chưa có mẫu sẵn. Hãy thử lại hoặc chọn ngữ pháp khác."
            : "Không tạo được câu hỏi. Vui lòng thử lại.";
        toast.error(msg);
      } finally {
        setGenerating(false);
      }
    },
    [currentSource],
  );

  const startDrill = () => {
    if (selected.size === 0) {
      toast.error("Hãy chọn ít nhất một mẫu ngữ pháp.");
      return;
    }
    if (sourceType === "DECK" && deckId == null) {
      toast.error("Hãy chọn một bộ thẻ để lấy từ vựng.");
      return;
    }
    // Round-robin interleave so the same grammar doesn't repeat back-to-back.
    const ids = [...selected];
    const slots: number[] = [];
    for (let round = 0; round < countPer; round++) {
      for (const id of ids) slots.push(id);
    }
    setQueue(slots);
    setIndex(0);
    setPhase("drilling");
    void generateAt(0, slots);
  };

  const onSubmit = async () => {
    if (!exercise || !answer.trim()) return;
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
    const ni = index + 1;
    setIndex(ni);
    if (ni < queue.length) void generateAt(ni, queue);
  };

  const restart = () => {
    setPhase("setup");
    setQueue([]);
    setIndex(0);
    setExercise(null);
    setResult(null);
    setAnswer("");
    setSubmittedAnswer("");
  };

  const finished = phase === "drilling" && index >= queue.length;

  // ── SETUP ──────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <MainLayout pathName={{ "/production/drill": "Luyện theo bộ" }}>
        <div className="w-full flex flex-col gap-6 max-w-3xl">
          {setupLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <>
              <Card className="p-6 gap-4">
                <div className="font-semibold">1. Chọn mẫu ngữ pháp muốn luyện</div>
                <div className="flex flex-col gap-4">
                  {grammarsByLevel.map(([lvl, items]) => (
                    <div key={lvl} className="flex flex-col gap-2">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {lvl}
                      </div>
                      <div className="flex flex-wrap gap-2">
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
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Đã chọn: {selected.size} mẫu
                </div>
              </Card>

              <Card className="p-6 gap-4">
                <div className="font-semibold">2. Nguồn từ vựng</div>
                <div className="flex flex-col gap-3">
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
                      Theo cấp độ JLPT
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
                      Từ bộ thẻ của tôi
                    </button>
                  </div>

                  {sourceType === "LEVEL" ? (
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-48 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      {JLPT_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  ) : decks.length > 0 ? (
                    <select
                      value={deckId ?? ""}
                      onChange={(e) => setDeckId(Number(e.target.value))}
                      className="w-72 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      {decks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Bạn chưa có bộ thẻ nào. Hãy dùng nguồn theo cấp độ JLPT.
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 gap-4">
                <div className="font-semibold">3. Số câu mỗi mẫu</div>
                <select
                  value={countPer}
                  onChange={(e) => setCountPer(Number(e.target.value))}
                  className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <div className="text-sm text-muted-foreground">
                  Tổng cộng: {selected.size * countPer} câu
                </div>
              </Card>

              <div>
                <Button onClick={startDrill} disabled={selected.size === 0}>
                  <Sparkles size={16} />
                  Bắt đầu luyện
                </Button>
              </div>
            </>
          )}
        </div>
      </MainLayout>
    );
  }

  // ── DRILLING ───────────────────────────────────────────────────────────
  return (
    <MainLayout pathName={{ "/production/drill": "Luyện theo bộ" }}>
      <div className="w-full flex flex-col gap-6 max-w-3xl">
        {finished ? (
          <Card className="p-6 gap-4">
            <div className="font-semibold text-lg">Hoàn thành! 🎉</div>
            <p className="text-sm text-muted-foreground">
              Bạn đã luyện xong {queue.length} câu.
            </p>
            <div>
              <Button onClick={restart}>Luyện bộ mới</Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Câu {index + 1} / {queue.length}
              </span>
              <Button variant="ghost" size="sm" onClick={restart}>
                Thoát
              </Button>
            </div>

            {generating ? (
              <Card className="p-6 flex items-center justify-center gap-3 h-40">
                <Loader2 className="animate-spin text-primary" size={24} />
                <span className="text-sm text-muted-foreground">Đang tạo câu hỏi…</span>
              </Card>
            ) : exercise ? (
              <>
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
                    {result && (
                      <Button variant="outline" onClick={next} disabled={submitting}>
                        {index + 1 < queue.length ? "Câu tiếp" : "Hoàn thành"}
                      </Button>
                    )}
                  </div>
                </Card>

                {result && (
                  <Card className="p-6 gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={VERDICT_STYLE[result.finalVerdict]}>
                        {VERDICT_LABEL[result.finalVerdict] ?? result.finalVerdict}
                      </Badge>
                      <Badge variant={result.detectorPassed ? "secondary" : "outline"}>
                        {result.detectorPassed ? "Đúng cấu trúc" : "Chưa thấy cấu trúc"}
                      </Badge>
                      {result.judgeScore != null && (
                        <span className="text-sm text-muted-foreground">
                          Độ chính xác: {(result.judgeScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    {result.referenceAnswer && (
                      <div className="border-l-4 border-green-600 bg-green-600/5 pl-4 py-2">
                        <div className="text-xs uppercase tracking-wide text-green-600 font-semibold mb-1">
                          Đáp án mẫu (100%)
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

                    {result.feedback && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {result.feedback}
                      </p>
                    )}
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-6 gap-4">
                <p className="text-sm text-muted-foreground">
                  Không tạo được câu hỏi cho mẫu này.
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => generateAt(index, queue)}>Thử lại</Button>
                  <Button variant="outline" onClick={next}>
                    Bỏ qua
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
