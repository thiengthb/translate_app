import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, Keyboard, Library, Loader2, Target, Waves, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { GameHUD } from "@/features/kana-shark/components/GameHUD";
import { GameResultModal } from "@/features/kana-shark/components/GameResultModal";
import { GameSetupPanel } from "@/features/kana-shark/components/GameSetupPanel";
import { PixiTypingScene } from "@/features/kana-shark/components/PixiTypingScene";
import { TypingInput } from "@/features/kana-shark/components/TypingInput";
import { useKanaSharkGame } from "@/features/kana-shark/hooks/useKanaSharkGame";
import { useKanaSharkDecks, useKanaSharkItems } from "@/features/kana-shark/hooks/useKanaSharkItems";
import { useSrsReviewSubmitQueue } from "@/features/kana-shark/hooks/useSrsReviewSubmitQueue";
import type { KanaSharkSettings, TypingResult } from "@/features/kana-shark/types/kanaShark.types";
import { defaultKanaSharkSettings } from "@/features/kana-shark/utils/performanceMode";
import type { DeckDTO } from "@/types";

export default function KanaSharkPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const queryDeckId = Number(searchParams.get("deckId"));
  const initialDeckId = Number.isFinite(queryDeckId) && queryDeckId > 0 ? queryDeckId : null;

  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(initialDeckId);
  const [settings, setSettings] = useState<KanaSharkSettings>(() => defaultKanaSharkSettings("balanced"));
  const [inputValue, setInputValue] = useState("");
  const [dismissedResultKey, setDismissedResultKey] = useState("");
  const submittedRoundRef = useRef("");

  const decksQuery = useKanaSharkDecks();
  const decks = useMemo(
    () => (decksQuery.data ?? []).filter((deck): deck is DeckDTO & { id: number } => typeof deck.id === "number"),
    [decksQuery.data],
  );

  const effectiveDeckId = useMemo(() => {
    if (selectedDeckId != null) return selectedDeckId;
    if (decks.length === 0) return null;
    const deckFromQuery = initialDeckId != null ? decks.find((deck) => deck.id === initialDeckId)?.id : null;
    return deckFromQuery ?? decks[0].id;
  }, [decks, initialDeckId, selectedDeckId]);

  const itemsQuery = useKanaSharkItems(effectiveDeckId, settings.mode, settings.maxItems);
  const game = useKanaSharkGame(settings);
  const {
    submitting,
    submitted,
    failedResults,
    submitResults,
    retryFailed,
    resetSubmitState,
  } = useSrsReviewSubmitQueue();

  const updateSettings = useCallback((patch: Partial<KanaSharkSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const handleSceneError = useCallback((message: string) => {
    toast.warning(message);
  }, []);

  const handleDeckChange = useCallback(
    (deckId: number) => {
      game.reset();
      resetSubmitState();
      submittedRoundRef.current = "";
      setInputValue("");
      setDismissedResultKey("");
      setSelectedDeckId(deckId);
    },
    [game, resetSubmitState],
  );

  const startRound = useCallback(() => {
    if (effectiveDeckId == null) {
      toast.error("Chọn một deck trước khi chơi.");
      return;
    }
    if (itemsQuery.isLoading || itemsQuery.isFetching) {
      toast.info("Đang tải queue SRS của deck.");
      return;
    }
    if (itemsQuery.items.length === 0) {
      toast.warning("Chưa có item phù hợp để chơi. Hãy thêm flashcard hoặc review deck trước.");
      return;
    }

    submittedRoundRef.current = "";
    resetSubmitState();
    setInputValue("");
    setDismissedResultKey("");
    game.start(itemsQuery.items);
  }, [effectiveDeckId, game, itemsQuery.isFetching, itemsQuery.isLoading, itemsQuery.items, resetSubmitState]);

  const roundKey = useMemo(
    () => game.results.map((result) => `${result.id}:${result.rating}`).join("|") || "empty-round",
    [game.results],
  );
  const resultOpen = game.status === "finished" && dismissedResultKey !== roundKey;

  useEffect(() => {
    if (game.status !== "finished") return;
    if (game.results.length === 0) return;

    if (submittedRoundRef.current === roundKey) return;
    submittedRoundRef.current = roundKey;

    void submitResults(game.results).finally(() => {
      void queryClient.invalidateQueries({ queryKey: ["kana-shark"] });
      void queryClient.invalidateQueries({ queryKey: ["decks"] });
    });
  }, [game.results, game.status, queryClient, roundKey, submitResults]);

  const recentResults = useMemo(() => game.results.slice(-8).reverse(), [game.results]);
  const itemsLoading = effectiveDeckId != null && (itemsQuery.isLoading || itemsQuery.isFetching);
  const currentDeck = decks.find((deck) => deck.id === effectiveDeckId);
  const noDecks = !decksQuery.isLoading && decks.length === 0;

  return (
    <MainLayout
      pathName={{ "/student/learning/kana-shark": "Kana Shark" }}
      ignorePaths={["student", "learning"]}
      pageDescription="Typing Shark bằng PixiJS, lấy item từ deck/SRS thật và ghi kết quả về review log."
      breadcrumbIcon={<Keyboard className="size-[18px] text-primary" />}
      pageScroll
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <GameSetupPanel
          decks={decks}
          selectedDeckId={effectiveDeckId}
          settings={settings}
          status={game.status}
          decksLoading={decksQuery.isLoading}
          itemsLoading={itemsLoading}
          itemsCount={itemsQuery.items.length}
          onDeckChange={handleDeckChange}
          onSettingsChange={updateSettings}
          onStart={startRound}
          onPause={game.pause}
          onResume={game.resume}
          onReset={() => {
            game.reset();
            resetSubmitState();
            submittedRoundRef.current = "";
            setInputValue("");
            setDismissedResultKey("");
          }}
        />

        {decksQuery.isError && (
          <Notice
            tone="danger"
            title="Không tải được deck"
            description="Kiểm tra phiên đăng nhập hoặc quyền đọc Library rồi thử lại."
          />
        )}

        {noDecks && (
          <Notice
            tone="neutral"
            title="Chưa có deck để chơi"
            description="Kana Shark lấy thẻ từ deck có sẵn của bạn. Hãy mở Thư viện để tạo hoặc chọn một deck, rồi quay lại đây."
            action={
              <Button
                size="sm"
                onClick={() => navigate("/library")}
                className="bg-gradient-to-r from-cyan-500 to-sky-600 text-white hover:from-cyan-600 hover:to-sky-700"
              >
                <Library className="size-4" />
                Mở Thư viện
              </Button>
            }
          />
        )}

        {effectiveDeckId != null && !itemsLoading && itemsQuery.items.length === 0 && !itemsQuery.isError && !noDecks && (
          <Notice
            tone="neutral"
            title="Chưa có item phù hợp"
            description="Game cần card có kana/romaji trong queue SRS hôm nay. Hãy thêm reading cho flashcard hoặc học deck thêm một chút."
          />
        )}

        {itemsQuery.isError && (
          <Notice
            tone="danger"
            title="Không tải được SRS queue"
            description="Endpoint Anki study queue đang lỗi hoặc deck không có quyền đọc."
          />
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          <section className="relative flex min-h-[420px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-sm">
            {/* Canvas fills the whole frame */}
            <div className="absolute inset-0">
              {itemsLoading ? (
                <div className="flex h-full items-center justify-center text-slate-200">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Đang tải queue SRS...
                </div>
              ) : (
                <PixiTypingScene
                  enemies={game.sceneEnemies}
                  status={game.status}
                  performanceMode={settings.performanceMode}
                  onEnemyMissed={game.missEnemy}
                  onSceneError={handleSceneError}
                />
              )}
            </div>

            {/* In-canvas overlays — stats top, type box bottom */}
            <GameHUD
              status={game.status}
              hp={game.hp}
              maxHp={settings.maxHp}
              score={game.score}
              combo={game.combo}
              secondsLeft={game.secondsLeft}
            />

            <TypingInput
              value={inputValue}
              status={game.status}
              currentTarget={game.currentTarget}
              onValueChange={setInputValue}
              onAttempt={game.submitInput}
            />

            {/* Idle / finished call-to-action */}
            {!itemsLoading && game.status !== "playing" && game.status !== "paused" && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
                <div className="rounded-2xl bg-slate-900/70 px-6 py-5 text-center text-slate-100 ring-1 ring-white/10 backdrop-blur-sm">
                  <span className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/30">
                    <Waves className="size-6" />
                  </span>
                  <div className="font-semibold">
                    {game.status === "finished" ? "Vòng chơi kết thúc" : "Sẵn sàng lặn?"}
                  </div>
                  <p className="mt-1 max-w-xs text-sm text-slate-300">
                    Bấm <span className="font-semibold text-cyan-300">Start</span> ở thanh trên để thả cá mập từ queue
                    của deck.
                  </p>
                </div>
              </div>
            )}
          </section>

          <aside className="flex min-h-0 shrink-0 flex-col gap-3 lg:w-[300px]">
            <SidePanel title="Target" icon={<Target className="size-4 text-cyan-500" />} accent="cyan">
              {game.currentTarget ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Prompt</div>
                    <div className="mt-1 rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-sky-50 px-3 py-3 text-2xl font-bold tracking-wide text-slate-900 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800 dark:text-slate-50">
                      {game.currentTarget.prompt}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <InfoPill label="State" value={game.currentTarget.state} />
                    <InfoPill label="Deck" value={currentDeck?.title ?? "Current"} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Đáp án được ẩn khi đang chơi. Gõ đúng cách đọc để tiêu diệt cá mập.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa có enemy. Bấm Start để lấy item từ queue của deck đã chọn.
                </p>
              )}
            </SidePanel>

            <SidePanel title="Round feed" icon={<CheckCircle2 className="size-4 text-emerald-500" />} accent="emerald" fill>
              {recentResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">Các item đã xử lý sẽ hiện ở đây.</p>
              ) : (
                <div className="h-full space-y-2 overflow-y-auto pr-1">
                  {recentResults.map((result) => (
                    <ResultRow key={result.id} result={result} />
                  ))}
                </div>
              )}
            </SidePanel>

            <SidePanel title="SRS sync" icon={<Waves className="size-4 text-sky-500" />} accent="sky">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoPill label="Submitted" value={submitted} />
                <InfoPill label="Failed" value={failedResults.length} tone={failedResults.length > 0 ? "danger" : undefined} />
              </div>
              {submitting && (
                <p className="mt-3 flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Đang gửi review log...
                </p>
              )}
              {failedResults.length > 0 && (
                <Button className="mt-3 w-full" variant="outline" size="sm" onClick={retryFailed} disabled={submitting}>
                  Gửi lại review lỗi
                </Button>
              )}
            </SidePanel>
          </aside>
        </div>
      </motion.div>

      <GameResultModal
        open={resultOpen}
        summary={game.summary}
        submitting={submitting}
        submitted={submitted}
        failed={failedResults.length}
        onRetry={retryFailed}
        onClose={() => setDismissedResultKey(roundKey)}
        onPlayAgain={startRound}
      />
    </MainLayout>
  );
}

const ACCENT_RING: Record<string, string> = {
  cyan: "bg-cyan-500/10",
  emerald: "bg-emerald-500/10",
  sky: "bg-sky-500/10",
};

function SidePanel({
  title,
  icon,
  accent = "cyan",
  fill,
  children,
}: {
  title: string;
  icon: ReactNode;
  accent?: "cyan" | "emerald" | "sky";
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex flex-col rounded-2xl border bg-card p-4 shadow-sm ring-1 ring-black/[0.02] ${
        fill ? "min-h-0 flex-1" : ""
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex size-8 items-center justify-center rounded-lg ${ACCENT_RING[accent]}`}>{icon}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className={fill ? "min-h-0 flex-1" : ""}>{children}</div>
    </section>
  );
}

function Notice({
  tone,
  title,
  description,
  action,
}: {
  tone: "danger" | "neutral";
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const danger = tone === "danger";
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        {danger ? (
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
        ) : (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
            <Waves className="size-5 text-cyan-500" />
          </span>
        )}
        <div className="min-w-0">
          <div className="font-semibold">{title}</div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function InfoPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "danger";
}) {
  return (
    <div
      className={`min-w-0 rounded-lg border bg-background px-3 py-2 ${
        tone === "danger" ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30" : ""
      }`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`truncate font-semibold ${tone === "danger" ? "text-red-600 dark:text-red-400" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: TypingResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
    >
      {result.correct ? (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
      ) : (
        <XCircle className="size-4 shrink-0 text-red-500" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{result.item.prompt}</div>
        <div className="text-xs text-muted-foreground">
          {result.rating} · {result.timeTakenMs}ms · {result.mistakes} miss
        </div>
      </div>
      <span className="text-xs font-semibold text-primary">+{result.score}</span>
    </motion.div>
  );
}
