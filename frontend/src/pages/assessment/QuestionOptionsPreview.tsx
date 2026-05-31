import type { QuestionBankDTO, QuestionOptionDTO } from "@/types";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Human labels for every question type (active + hidden). */
export const QUESTION_TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "Single Choice",
  MULTIPLE_CHOICE: "Multiple Choice",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in the Blank",
  // Hidden types — kept for data display only
  WRITING: "Writing",
  MATCHING: "Matching",
  ORDERING: "Ordering",
  LISTENING: "Listening",
};

/**
 * Reveals a bank question's options — correct answers in green, others with
 * a faint circle. FILL_BLANK shows its accepted answers as chips. Renders
 * the question explanation underneath when present. The caller owns the
 * surrounding container/padding so this can be dropped into a card body, a
 * table detail row, etc.
 */
export function QuestionOptionsPreview({ question: q }: { question: QuestionBankDTO }) {
  const isFillBlank = q.questionType === "FILL_BLANK";

  return (
    <div className="space-y-2">
      {q.options.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No options for this question.</p>
      ) : isFillBlank ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Accepted answers</p>
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((o) => (
              <span
                key={o.id}
                className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400"
              >
                {o.content}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {q.options.map((o) => (
            <OptionRow key={o.id} option={o} />
          ))}
        </div>
      )}

      {q.explanation && (
        <p className="pt-2 mt-1 border-t border-border/50 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">Explanation: </span>
          {q.explanation}
        </p>
      )}
    </div>
  );
}

function OptionRow({ option: o }: { option: QuestionOptionDTO }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md px-2.5 py-1.5 text-sm",
        o.isCorrect
          ? "bg-green-500/10 text-green-700 dark:text-green-400 font-medium"
          : "text-foreground/70",
      )}
    >
      {o.isCorrect ? (
        <Check className="size-4 mt-0.5 shrink-0" />
      ) : (
        <Circle className="size-3.5 mt-[3px] shrink-0 opacity-40" />
      )}
      <span className="flex-1">{o.content}</span>
    </div>
  );
}
