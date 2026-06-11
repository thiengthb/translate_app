import { Loader2, PartyPopper, RotateCcw, UploadCloud } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { KanaSharkSummary } from "../types/kanaShark.types";

interface GameResultModalProps {
  open: boolean;
  summary: KanaSharkSummary;
  submitting: boolean;
  submitted: number;
  failed: number;
  onRetry: () => void;
  onClose: () => void;
  onPlayAgain: () => void;
}

const RATING_TONE: Record<string, string> = {
  AGAIN: "text-rose-600 dark:text-rose-400",
  HARD: "text-amber-600 dark:text-amber-400",
  GOOD: "text-emerald-600 dark:text-emerald-400",
  EASY: "text-sky-600 dark:text-sky-400",
};

export function GameResultModal({
  open,
  summary,
  submitting,
  submitted,
  failed,
  onRetry,
  onClose,
  onPlayAgain,
}: GameResultModalProps) {
  const great = summary.accuracy >= 80;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        {/* Themed header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-cyan-500 to-sky-600 px-6 py-5 text-white">
          <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/15 blur-2xl" />
          <DialogHeader className="relative space-y-1">
            <DialogTitle className="flex items-center gap-2 text-white">
              <PartyPopper className="size-5" />
              {great ? "Round tuyệt vời!" : "Round hoàn tất"}
            </DialogTitle>
            <DialogDescription className="text-cyan-50/90">
              Kết quả đã map sang rating SRS và gửi về review endpoint của deck.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Accuracy" value={`${summary.accuracy}%`} highlight={great} />
            <Metric label="Score" value={summary.score.toLocaleString()} />
            <Metric label="Max combo" value={`x${summary.maxCombo}`} />
          </div>

          <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <Line label="Total" value={summary.totalItems} />
            <Line label="Correct" value={summary.correct} />
            <Line label="Missed" value={summary.missed} />
            <Line label="Avg response" value={`${summary.averageResponseMs}ms`} />
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            {(["AGAIN", "HARD", "GOOD", "EASY"] as const).map((rating) => (
              <div key={rating} className="rounded-lg border bg-background px-3 py-2 text-center">
                <div className="text-muted-foreground">{rating}</div>
                <div className={cn("text-base font-bold", RATING_TONE[rating])}>{summary.ratingCounts[rating]}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-background p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4 text-primary" />}
              SRS sync
            </div>
            <p className="mt-1 text-muted-foreground">
              Submitted {submitted}/{summary.totalItems}. Failed {failed}.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={onRetry} disabled={failed === 0 || submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              Gửi lại review lỗi
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Đóng
              </Button>
              <Button
                onClick={onPlayAgain}
                className="bg-gradient-to-r from-cyan-500 to-sky-600 text-white hover:from-cyan-600 hover:to-sky-700"
              >
                <RotateCcw className="size-4" />
                Chơi lại
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border px-3 py-3",
        highlight
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-cyan-950/30"
          : "bg-background",
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-bold", highlight && "text-emerald-600 dark:text-emerald-400")}>{value}</div>
    </motion.div>
  );
}

function Line({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
